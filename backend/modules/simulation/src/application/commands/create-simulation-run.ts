import { createHash, randomUUID } from "node:crypto";
import type {
	CreateSimulationRunCommand,
	SimulationCommandResult,
} from "@anxionos/contracts/simulation";
import {
	assertSimulationExecutionModeSupported,
	createSimulationRunCommandSchema,
	simulationCommandResultSchema,
} from "@anxionos/contracts/simulation";
import { createSimulationRunStartedEvent } from "../../domain/events/simulation-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SimulationUnitOfWork } from "../../domain/ports/simulation-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { resolveDatasetHash } from "../dataset-hash-support";
import { parseCommandResultSnapshot, throwSimulationError } from "../errors";

export interface CreateSimulationRunDeps {
	unitOfWork: SimulationUnitOfWork;
	commandJournal: CommandJournalRepository;
}

const DEFAULT_SANDBOX_POLICY = {
	networkEgress: "deny",
	cpuQuota: "org-default",
	memoryQuota: "org-default",
};

function resolveManifestPayload(
	manifest: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
	if (!manifest) return null;
	return manifest;
}

export async function createSimulationRun(
	deps: CreateSimulationRunDeps,
	input: CreateSimulationRunCommand,
): Promise<SimulationCommandResult> {
	const command = createSimulationRunCommandSchema.parse(input);
	assertSimulationExecutionModeSupported(command.executionMode);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwSimulationError(
			"SIM_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			if (raced.organizationId !== command.organizationId) {
				throwSimulationError(
					"SIM_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return simulationCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		if (command.backtestRequestId) {
			const existingRun = await ctx.runs.findByOrganizationAndBacktestRequestId(
				command.organizationId,
				command.backtestRequestId,
			);
			if (existingRun) {
				throwSimulationError(
					"SIM_DUPLICATE_IDEMPOTENCY",
					`backtest request ${command.backtestRequestId} already has simulation run ${existingRun.id}`,
				);
			}
		}
		let manifestId: string | null = null;
		if (command.manifest) {
			manifestId = `sim_mnf_${randomUUID()}`;
			await ctx.manifests.save({
				id: manifestId,
				organizationId: command.organizationId,
				fidelityTier: "TIER_SIMULATED",
				datasetHash: resolveDatasetHash(command.manifest),
				sandboxPolicy: DEFAULT_SANDBOX_POLICY,
				manifestPayload: resolveManifestPayload(command.manifest),
			});
		}
		const simulationRunId = `sim_run_${randomUUID()}`;
		const startedAt = new Date().toISOString();
		const saved = await ctx.runs.save({
			id: simulationRunId,
			organizationId: command.organizationId,
			manifestId,
			strategyId: command.strategyId ?? null,
			strategyVersionId: command.strategyVersionId ?? null,
			backtestRequestId: command.backtestRequestId ?? null,
			executionMode: command.executionMode,
			status: "STARTED",
			scenarioLabel: command.scenarioLabel ?? null,
			isolationFlags: command.isolationFlags,
			seedHash: command.manifest?.seed
				? createHash("sha256")
						.update(String(command.manifest.seed))
						.digest("hex")
				: null,
			resultRef: null,
			revision: 1,
			startedAt,
			completedAt: null,
			failedAt: null,
			failureCode: null,
		});
		await ctx.publishEvents([
			createSimulationRunStartedEvent({
				simulationRunId: saved.id,
				organizationId: saved.organizationId,
				strategyId: saved.strategyId ?? undefined,
				strategyVersionId: saved.strategyVersionId ?? undefined,
				backtestRequestId: saved.backtestRequestId ?? undefined,
				executionMode: "SIMULATED",
				status: "STARTED",
				isolationFlags: saved.isolationFlags,
				scenarioLabel: saved.scenarioLabel ?? undefined,
				startedAt: saved.startedAt,
			}),
		]);
		const result = simulationCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			simulationRunId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createSimulationRun",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
