import { randomUUID } from "node:crypto";
import type {
	OperationsCommandResult,
	RequestDeletionCommand,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	requestDeletionCommandSchema,
} from "@anxionos/contracts/operations";
import { createDeletionRequestedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface RequestDeletionDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

/** ANX-313 S3 — request tenant-scoped deletion (privileged; requires approval). */
export async function requestDeletion(
	deps: RequestDeletionDeps,
	input: RequestDeletionCommand,
): Promise<OperationsCommandResult> {
	const command = requestDeletionCommandSchema.parse(input);
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

		const policy = await ctx.retentionPolicies.findByOrganizationAndScope(
			command.organizationId,
			command.scope,
		);
		if (!policy) {
			throwOperationsError(
				"OPS_RETENTION_POLICY_NOT_FOUND",
				`no retention policy for scope ${command.scope}`,
			);
		}
		if (policy.legalHold) {
			throwOperationsError(
				"OPS_DELETION_NOT_ELIGIBLE",
				"legal hold blocks deletion",
			);
		}

		const deletionRequestId = `ops_del_${randomUUID()}`;
		const now = new Date();
		await ctx.deletionRequests.save({
			id: deletionRequestId,
			organizationId: command.organizationId,
			scope: command.scope,
			subjectId: command.subjectId,
			policyId: command.policyId,
			status: "REQUESTED",
			requestedBy: command.requestedBy,
			approvedBy: null,
			approvedAt: null,
			executedAt: null,
			createdAt: now,
			updatedAt: now,
		});
		await ctx.publishEvents([
			createDeletionRequestedEvent({
				deletionRequestId,
				organizationId: command.organizationId,
				scope: command.scope,
				subjectId: command.subjectId,
				policyId: command.policyId,
				requestedBy: command.requestedBy,
			}),
		]);
		const result = operationsCommandResultSchema.parse({
			aggregateId: deletionRequestId,
			revision: 1,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "requestDeletion",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}