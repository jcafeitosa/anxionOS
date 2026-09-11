import { randomUUID } from "node:crypto";
import type {
	CreateExportJobCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import {
	createExportJobCommandSchema,
	operationsCommandResultSchema,
} from "@anxionos/contracts/operations";
import { createExportJobRequestedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface CreateExportJobDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

/** ANX-313 S3 — create an idempotent tenant-scoped export job (manifest). */
export async function createExportJob(
	deps: CreateExportJobDeps,
	input: CreateExportJobCommand,
): Promise<OperationsCommandResult> {
	const command = createExportJobCommandSchema.parse(input);
	const existing = await deps.commandJournal.findByCommandId(command.commandId);
	if (existing && existing.organizationId !== command.organizationId) {
		throwOperationsError(
			"OPS_CROSS_TENANT",
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
				throwOperationsError(
					"OPS_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return operationsCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const exportJobId = `ops_exp_${randomUUID()}`;
		const now = new Date();
		await ctx.exportJobs.save({
			id: exportJobId,
			organizationId: command.organizationId,
			scope: command.scope,
			subjectId: command.subjectId,
			status: "REQUESTED",
			manifestJson: null,
			requestedBy: command.requestedBy,
			completedAt: null,
			createdAt: now,
			updatedAt: now,
		});
		await ctx.publishEvents([
			createExportJobRequestedEvent({
				exportJobId,
				organizationId: command.organizationId,
				scope: command.scope,
				subjectId: command.subjectId,
				requestedBy: command.requestedBy,
			}),
		]);
		const result = operationsCommandResultSchema.parse({
			aggregateId: exportJobId,
			revision: 1,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "createExportJob",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}