import { randomUUID } from "node:crypto";
import type {
	ExecuteSimulationRunCommand,
	SimulationCommandResult,
} from "@anxionos/contracts/simulation";
import {
	executeSimulationRunCommandSchema,
	simulationCommandResultSchema,
} from "@anxionos/contracts/simulation";
import { SimulationRunRevisionConflictError } from "../../domain/errors/simulation-run-errors";
import {
	createSimulationRunCompletedEvent,
	createSimulationRunFailedEvent,
	createSimulationSnapshotCreatedEvent,
} from "../../domain/events/simulation-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SimulationResultStorePort } from "../../domain/ports/simulation-result-store-port";
import type { SimulationSandboxPort } from "../../domain/ports/simulation-sandbox-port";
import type {
	SimulationRunRecord,
	SimulationTransactionContext,
	SimulationUnitOfWork,
} from "../../domain/ports/simulation-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { DEFAULT_DATASET_HASH } from "../dataset-hash-support";
import { parseCommandResultSnapshot, throwSimulationError } from "../errors";

export interface ExecuteSimulationRunDeps {
	unitOfWork: SimulationUnitOfWork;
	commandJournal: CommandJournalRepository;
	sandbox: SimulationSandboxPort;
	resultStore: SimulationResultStorePort;
}

function finalizedCommandResult(
	run: { id: string; revision: number },
	replay = false,
): SimulationCommandResult {
	return simulationCommandResultSchema.parse({
		aggregateId: run.id,
		revision: run.revision,
		simulationRunId: run.id,
		idempotentReplay: replay || undefined,
	});
}

async function updateRunOptimistic(
	ctx: SimulationTransactionContext,
	run: SimulationRunRecord,
	updates: Pick<
		SimulationRunRecord,
		| "status"
		| "revision"
		| "resultRef"
		| "completedAt"
		| "failedAt"
		| "failureCode"
	>,
): Promise<SimulationRunRecord> {
	try {
		return await ctx.runs.update({
			...run,
			...updates,
		});
	} catch (error) {
		if (error instanceof SimulationRunRevisionConflictError) {
			throwSimulationError(
				"SIM_CONCURRENT_MUTATION",
				`simulation run ${run.id} revision conflict`,
			);
		}
		throw error;
	}
}

async function loadReplayOrThrow(
	ctx: SimulationTransactionContext,
	command: ExecuteSimulationRunCommand,
): Promise<SimulationCommandResult | null> {
	const raced = await ctx.commandJournal.findByCommandId(command.commandId);
	if (!raced) {
		return null;
	}
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

async function loadStartedRun(
	ctx: SimulationTransactionContext,
	command: ExecuteSimulationRunCommand,
): Promise<SimulationRunRecord> {
	const run = await ctx.runs.findByOrganizationAndId(
		command.organizationId,
		command.simulationRunId,
	);
	if (!run) {
		throwSimulationError(
			"SIM_RUN_NOT_FOUND",
			`simulation run ${command.simulationRunId} not found`,
		);
	}
	if (run.status === "COMPLETED" || run.status === "FAILED") {
		return run;
	}
	if (run.status !== "STARTED") {
		throwSimulationError(
			"SIM_RUN_INVALID_STATUS",
			`simulation run ${command.simulationRunId} is ${run.status}`,
		);
	}
	return run;
}

export async function executeSimulationRun(
	deps: ExecuteSimulationRunDeps,
	input: ExecuteSimulationRunCommand,
): Promise<SimulationCommandResult> {
	const command = executeSimulationRunCommandSchema.parse(input);
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
	if (replay) {
		return replay;
	}

	const runBefore = await deps.unitOfWork.runInTransaction(async (ctx) =>
		loadStartedRun(ctx, command),
	);
	if (runBefore.status === "COMPLETED" || runBefore.status === "FAILED") {
		return finalizedCommandResult(runBefore, true);
	}

	let manifestPayload: Record<string, unknown> | null = null;
	let expectedDatasetHash = DEFAULT_DATASET_HASH;
	if (runBefore.manifestId) {
		const manifest = await deps.unitOfWork.runInTransaction(async (ctx) =>
			ctx.manifests.findByOrganizationAndId(
				command.organizationId,
				runBefore.manifestId as string,
			),
		);
		if (manifest) {
			manifestPayload = manifest.manifestPayload;
			expectedDatasetHash = manifest.datasetHash;
		}
	}

	const sandboxResult = await deps.sandbox.execute({
		simulationRunId: runBefore.id,
		organizationId: runBefore.organizationId,
		seedHash: runBefore.seedHash,
		expectedDatasetHash,
		manifestPayload,
	});

	if (sandboxResult.status === "FAILED") {
		return deps.unitOfWork.runInTransaction(async (ctx) => {
			const replayed = await loadReplayOrThrow(ctx, command);
			if (replayed) {
				return replayed;
			}

			const run = await loadStartedRun(ctx, command);
			if (run.status === "COMPLETED" || run.status === "FAILED") {
				return finalizedCommandResult(run, true);
			}

			const failedAt = new Date().toISOString();
			const updated = await updateRunOptimistic(ctx, run, {
				status: "FAILED",
				failedAt,
				failureCode: sandboxResult.failureCode ?? "SIM_EXECUTION_FAILED",
				revision: run.revision + 1,
				resultRef: run.resultRef,
				completedAt: run.completedAt,
			});
			await ctx.publishEvents([
				createSimulationRunFailedEvent({
					simulationRunId: updated.id,
					organizationId: updated.organizationId,
					failureCode: updated.failureCode ?? "SIM_EXECUTION_FAILED",
					failedAt,
				}),
			]);
			const result = finalizedCommandResult(updated);
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "executeSimulationRun",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		});
	}

	if (!sandboxResult.metricsHash || !sandboxResult.resultPayload) {
		throwSimulationError(
			"SIM_RUN_INVALID_STATUS",
			"sandbox completed without metrics payload",
		);
	}

	const { resultRef } = await deps.resultStore.put({
		organizationId: runBefore.organizationId,
		simulationRunId: runBefore.id,
		metricsHash: sandboxResult.metricsHash,
		payload: sandboxResult.resultPayload,
	});

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const replayed = await loadReplayOrThrow(ctx, command);
		if (replayed) {
			return replayed;
		}

		const run = await loadStartedRun(ctx, command);
		if (run.status === "COMPLETED" || run.status === "FAILED") {
			return finalizedCommandResult(run, true);
		}

		const snapshotId = `sim_snap_${randomUUID()}`;
		const createdAt = new Date().toISOString();
		await ctx.snapshots.save({
			id: snapshotId,
			organizationId: run.organizationId,
			simulationRunId: run.id,
			datasetRef: resultRef,
			datasetHash: sandboxResult.datasetHash,
			snapshotPayload: sandboxResult.resultPayload,
		});

		const completedAt = createdAt;
		const updated = await updateRunOptimistic(ctx, run, {
			status: "COMPLETED",
			resultRef,
			completedAt,
			revision: run.revision + 1,
			failedAt: run.failedAt,
			failureCode: run.failureCode,
		});

		await ctx.publishEvents([
			createSimulationSnapshotCreatedEvent({
				simulationRunId: updated.id,
				organizationId: updated.organizationId,
				snapshotId,
				createdAt,
			}),
			// Payload schemaVersion 1.0.0 is carried on simulation.run.completed.v1 payload.
			createSimulationRunCompletedEvent({
				simulationRunId: updated.id,
				organizationId: updated.organizationId,
				resultRef,
				datasetHash: sandboxResult.datasetHash,
				snapshotId,
				completedAt,
			}),
		]);

		const result = finalizedCommandResult(updated);
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "executeSimulationRun",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
