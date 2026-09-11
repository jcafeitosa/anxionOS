import { randomUUID } from "node:crypto";
import type {
	DecisionsCommandResult,
	RequestHumanApprovalCommand,
} from "@anxionos/contracts/decisions";
import {
	decisionsCommandResultSchema,
	requestHumanApprovalCommandSchema,
} from "@anxionos/contracts/decisions";
import { createApprovalRequestedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";

export interface RequestHumanApprovalDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function requestHumanApproval(
	deps: RequestHumanApprovalDeps,
	input: RequestHumanApprovalCommand,
): Promise<DecisionsCommandResult> {
	const command = requestHumanApprovalCommandSchema.parse(input);
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
		const decision = await ctx.decisions.findById(command.decisionId);
		if (!decision || decision.organizationId !== command.organizationId) {
			throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
		}
		if (decision.status !== "AUTHORITY_CHECKED") {
			throwDecisionsError(
				"DC_AUTHORITY_STALE",
				"authority must be checked before human approval",
			);
		}
		const pending = await ctx.approvals.findPendingByDecisionId(decision.id);
		if (pending) {
			throwDecisionsError(
				"DC_APPROVAL_NOT_PENDING",
				"approval already pending for decision",
			);
		}
		const approvalId = `dc_apr_${randomUUID()}`;
		await ctx.approvals.save({
			id: approvalId,
			decisionId: decision.id,
			organizationId: command.organizationId,
			proposerId: command.proposerId,
			status: "PENDING",
			runId: command.runId,
			operationId: command.operationId,
		});
		const updated = await ctx.decisions.updateApprovalPath(decision.id, {
			status: "WAITING_APPROVAL",
			revision: decision.revision + 1,
			proposerId: command.proposerId,
			runId: command.runId,
			approvalPath: true,
		});
		await ctx.publishEvents([
			createApprovalRequestedEvent({
				decisionId: updated.id,
				organizationId: command.organizationId,
				approvalId,
				proposerId: command.proposerId,
				correlationId: decision.correlationId,
				runId: command.runId,
				operationId: command.operationId,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			decisionId: updated.id,
			approvalId,
			waitingHuman: true,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "requestHumanApproval",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
