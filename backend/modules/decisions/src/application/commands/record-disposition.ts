import { randomUUID } from "node:crypto";
import type {
	DecisionsCommandResult,
	RecordDispositionCommand,
} from "@anxionos/contracts/decisions";
import {
	decisionsCommandResultSchema,
	recordDispositionCommandSchema,
} from "@anxionos/contracts/decisions";
import { createDispositionRecordedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";
import { armSubmitPreconditions } from "../submit-preconditions-support";

export interface RecordDispositionDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordDisposition(
	deps: RecordDispositionDeps,
	input: RecordDispositionCommand,
): Promise<DecisionsCommandResult> {
	const command = recordDispositionCommandSchema.parse(input);
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
		if (decision.status !== "APPROVED") {
			throwDecisionsError(
				"DC_DISPOSITION_INVALID",
				"decision must be approved before disposition",
			);
		}
		const existingDisposition = await ctx.dispositions.findByDecisionId(
			decision.id,
		);
		if (existingDisposition) {
			throwDecisionsError(
				"DC_DISPOSITION_INVALID",
				"disposition already recorded",
			);
		}
		const dispositionId = `dc_dsp_${randomUUID()}`;
		await ctx.dispositions.save({
			id: dispositionId,
			decisionId: decision.id,
			organizationId: command.organizationId,
			dispositionKind: command.dispositionKind,
			outcome: command.outcome,
			reason: command.reason,
			approverId: command.approverId,
			intentHash: command.intentHash,
		});
		const nextStatus =
			command.dispositionKind === "APPROVED"
				? command.intentHash
					? "RISK_PENDING"
					: "APPROVED"
				: "DENIED";
		const updated = await ctx.decisions.updateStatus(
			decision.id,
			nextStatus,
			decision.revision + 1,
		);
		if (command.dispositionKind === "APPROVED" && command.intentHash) {
			await armSubmitPreconditions(
				ctx.submitPreconditions,
				updated,
				command.intentHash,
			);
		}
		await ctx.publishEvents([
			createDispositionRecordedEvent({
				decisionId: updated.id,
				organizationId: command.organizationId,
				dispositionId,
				dispositionKind: command.dispositionKind,
				outcome: command.outcome,
				reason: command.reason,
				approverId: command.approverId,
				intentHash: command.intentHash,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			decisionId: updated.id,
			dispositionId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordDisposition",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
