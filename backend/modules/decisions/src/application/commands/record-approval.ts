import type {
	DecisionsCommandResult,
	RecordApprovalCommand,
} from "@anxionos/contracts/decisions";
import {
	decisionsCommandResultSchema,
	recordApprovalCommandSchema,
} from "@anxionos/contracts/decisions";
import { createApprovalRecordedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";

export interface RecordApprovalDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordApproval(
	deps: RecordApprovalDeps,
	input: RecordApprovalCommand,
): Promise<DecisionsCommandResult> {
	const command = recordApprovalCommandSchema.parse(input);
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
		const decision = await ctx.decisions.findById(command.decisionId);
		if (!decision || decision.organizationId !== command.organizationId) {
			throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
		}
		if (decision.status !== "WAITING_APPROVAL") {
			throwDecisionsError(
				"DC_APPROVAL_NOT_PENDING",
				"decision is not waiting for approval",
			);
		}
		const pending = await ctx.approvals.findPendingByDecisionId(decision.id);
		if (!pending) {
			throwDecisionsError(
				"DC_APPROVAL_NOT_PENDING",
				"no pending approval for decision",
			);
		}
		if (command.approverId === pending.proposerId) {
			throwDecisionsError(
				"DC_INDEPENDENT_APPROVER_REQUIRED",
				"approver must be independent from proposer",
			);
		}
		const granted = await ctx.approvals.grant(pending.id, command.approverId);
		const updated = await ctx.decisions.updateStatus(
			decision.id,
			"APPROVED",
			decision.revision + 1,
		);
		await ctx.publishEvents([
			createApprovalRecordedEvent({
				decisionId: updated.id,
				organizationId: command.organizationId,
				approvalId: granted.id,
				approverId: command.approverId,
				proposerId: pending.proposerId,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			decisionId: updated.id,
			approvalId: granted.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordApproval",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
