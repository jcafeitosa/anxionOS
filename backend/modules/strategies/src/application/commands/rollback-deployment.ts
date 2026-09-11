import type {
	RollbackDeploymentCommand,
	StrategiesCommandResult,
} from "@anxionos/contracts/strategies";
import {
	rollbackDeploymentCommandSchema,
	strategiesCommandResultSchema,
} from "@anxionos/contracts/strategies";
import { createDeploymentRolledBackEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwStrategiesError } from "../errors";

export interface RollbackDeploymentDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

/** ANX-171 — rollback a deployment: marks it ROLLED_BACK (audited, journaled). */
export async function rollbackDeployment(
	deps: RollbackDeploymentDeps,
	input: RollbackDeploymentCommand,
): Promise<StrategiesCommandResult> {
	const command = rollbackDeploymentCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(
				raced,
				command.organizationId,
			);
		}
		const deployment = await ctx.deployments.findById(
			command.deploymentId,
			command.organizationId,
		);
		if (!deployment) {
			throwStrategiesError(
				"ST_DEPLOYMENT_NOT_FOUND",
				`Deployment ${command.deploymentId} not found`,
			);
		}
		if (deployment.status !== "ACTIVE") {
			throwStrategiesError(
				"ST_INVALID_DEPLOYMENT_STATUS",
				`Rollback requires ACTIVE deployment, got ${deployment.status}`,
			);
		}
		await ctx.deployments.updateStatus({
			...deployment,
			status: "ROLLED_BACK",
			revision: deployment.revision + 1,
		});
		await ctx.publishEvents([
			createDeploymentRolledBackEvent({
				deploymentId: deployment.id,
				organizationId: deployment.organizationId,
				strategyId: deployment.strategyId,
				strategyVersionId: deployment.strategyVersionId,
				reason: command.reason,
				rolledBackBy: command.rolledBackBy,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: deployment.id,
			revision: deployment.revision + 1,
			strategyId: deployment.strategyId,
			strategyVersionId: deployment.strategyVersionId,
			deploymentId: deployment.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "rollbackDeployment",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}