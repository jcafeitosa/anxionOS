import { createHash, randomUUID } from "node:crypto";
import type {
	ActivateDeploymentCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	activateDeploymentCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createDeploymentActivatedEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

const DEPLOYABLE_LIFECYCLE = new Set([
	"BACKTESTED",
	"EVALUATED",
	"CERTIFIED",
	"PAPER",
	"SUSPENDED",
]);

function hashBindingSnapshot(
	snapshot: ActivateDeploymentCommand["bindingSnapshot"],
): string {
	return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export interface ActivateDeploymentDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function activateDeployment(
	deps: ActivateDeploymentDeps,
	input: ActivateDeploymentCommand,
): Promise<StrategiesCommandResult> {
	const command = activateDeploymentCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}
		const strategy = await ctx.strategies.findById(
			command.strategyId,
			command.organizationId,
		);
		if (!strategy) {
			throwStrategiesError(
				"ST_STRATEGY_NOT_FOUND",
				`Strategy ${command.strategyId} not found`,
			);
		}
		const version = await ctx.versions.findById(
			command.strategyVersionId,
			command.organizationId,
		);
		if (!version || version.strategyId !== command.strategyId) {
			throwStrategiesError(
				"ST_VERSION_NOT_FOUND",
				`Strategy version ${command.strategyVersionId} not found`,
			);
		}
		if (!DEPLOYABLE_LIFECYCLE.has(version.lifecycleState)) {
			throwStrategiesError(
				"ST_INVALID_LIFECYCLE_TRANSITION",
				`Deployment requires BACKTESTED lifecycle or later, got ${version.lifecycleState}`,
			);
		}
		const paperReadyStates = new Set(["CERTIFIED", "PAPER", "SUSPENDED"]);
		if (
			command.executionMode === "PAPER" &&
			!paperReadyStates.has(version.lifecycleState)
		) {
			throwStrategiesError(
				"ST_CERTIFICATION_REQUIRED",
				`PAPER deployment requires CERTIFIED lifecycle, got ${version.lifecycleState}`,
			);
		}
		const deploymentId = `st_dep_${randomUUID()}`;
		const bindingHash = hashBindingSnapshot(command.bindingSnapshot);
		const initialStatus = command.canary === true ? "CANARY" : "ACTIVE";
		await ctx.deployments.save({
			id: deploymentId,
			organizationId: command.organizationId,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			executionMode: command.executionMode,
			portfolioId: command.portfolioId ?? null,
			bindingSnapshot: command.bindingSnapshot,
			status: initialStatus,
			revision: 1,
		});
		await ctx.publishEvents([
			createDeploymentActivatedEvent({
				deploymentId,
				organizationId: command.organizationId,
				strategyId: command.strategyId,
				strategyVersionId: command.strategyVersionId,
				executionMode: command.executionMode,
				portfolioId: command.portfolioId ?? null,
				bindingHash,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: deploymentId,
			revision: 1,
			strategyId: command.strategyId,
			strategyVersionId: command.strategyVersionId,
			deploymentId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "activateDeployment",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
