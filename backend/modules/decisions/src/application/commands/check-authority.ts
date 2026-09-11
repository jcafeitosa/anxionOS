import type {
	CheckAuthorityCommand,
	DecisionsCommandResult,
} from "@anxionos/contracts/decisions";
import {
	checkAuthorityCommandSchema,
	decisionsCommandResultSchema,
} from "@anxionos/contracts/decisions";
import { createAuthorityCheckedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";
import { armSubmitPreconditions } from "../submit-preconditions-support";

export interface CheckAuthorityDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function checkAuthority(
	deps: CheckAuthorityDeps,
	input: CheckAuthorityCommand,
): Promise<DecisionsCommandResult> {
	const command = checkAuthorityCommandSchema.parse(input);
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
		if (decision.grantId !== command.grantId) {
			throwDecisionsError("DC_AUTHORITY_STALE", "grant mismatch");
		}
		if (decision.expectedAuthorityEpoch !== command.authorityEpoch) {
			throwDecisionsError("DC_AUTHORITY_STALE", "authority epoch mismatch");
		}
		if (decision.status === "SUBMITTED") {
			throwDecisionsError("DC_INTENT_IMMUTABLE", "decision already submitted");
		}
		const nextStatus = command.intentHash
			? "RISK_PENDING"
			: "AUTHORITY_CHECKED";
		const updated = await ctx.decisions.updateStatus(
			decision.id,
			nextStatus,
			decision.revision + 1,
		);
		if (command.intentHash) {
			await armSubmitPreconditions(
				ctx.submitPreconditions,
				updated,
				command.intentHash,
			);
		}
		await ctx.publishEvents([
			createAuthorityCheckedEvent({
				decisionId: updated.id,
				organizationId: command.organizationId,
				grantId: command.grantId,
				authorityEpoch: command.authorityEpoch,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			decisionId: updated.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "checkAuthority",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
