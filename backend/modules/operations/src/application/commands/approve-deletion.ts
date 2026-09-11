import type {
	ApproveDeletionCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import {
	approveDeletionCommandSchema,
	operationsCommandResultSchema,
} from "@anxionos/contracts/operations";
import { createDeletionApprovedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface ApproveDeletionDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

/** ANX-313 S3 — approve a privileged deletion request (never auto-executes). */
export async function approveDeletion(
	deps: ApproveDeletionDeps,
	input: ApproveDeletionCommand,
): Promise<OperationsCommandResult> {
	const command = approveDeletionCommandSchema.parse(input);
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

		const request = await ctx.deletionRequests.findById(
			command.deletionRequestId,
		);
		if (!request) {
			throwOperationsError(
				"OPS_DELETION_NOT_ELIGIBLE",
				"deletion request not found",
			);
		}
		if (request.organizationId !== command.organizationId) {
			throwOperationsError(
				"OPS_CROSS_TENANT",
				"deletion request organization mismatch",
			);
		}
		if (request.status === "APPROVED" || request.status === "EXECUTED") {
			throwOperationsError(
				"OPS_DELETION_ALREADY_APPROVED",
				"deletion request already approved or executed",
			);
		}

		const now = new Date();
		await ctx.deletionRequests.save({
			...request,
			status: "APPROVED",
			approvedBy: command.approvedBy,
			approvedAt: now,
			updatedAt: now,
		});
		await ctx.publishEvents([
			createDeletionApprovedEvent({
				deletionRequestId: request.id,
				organizationId: request.organizationId,
				approvedBy: command.approvedBy,
			}),
		]);
		const result = operationsCommandResultSchema.parse({
			aggregateId: request.id,
			revision: 2,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "approveDeletion",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
