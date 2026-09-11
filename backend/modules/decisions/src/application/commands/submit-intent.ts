import { randomUUID } from "node:crypto";
import type {
	DecisionsCommandResult,
	SubmitIntentCommand,
} from "@anxionos/contracts/decisions";
import {
	assertDecisionsExecutionModeSupported,
	decisionsCommandResultSchema,
	submitIntentCommandSchema,
} from "@anxionos/contracts/decisions";
import { createIntentSubmittedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";
import { assertSubmitPreconditionsMet } from "../submit-preconditions-support";
import type { CapitalReservationQueryPort } from "../../domain/ports/capital-reservation-query-port";

export interface SubmitIntentDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
	capitalReservationQuery?: CapitalReservationQueryPort;
}

export async function submitIntent(
	deps: SubmitIntentDeps,
	input: SubmitIntentCommand,
): Promise<DecisionsCommandResult> {
	const command = submitIntentCommandSchema.parse(input);
	assertDecisionsExecutionModeSupported(command.executionMode);
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
		if (decision.status === "SUBMITTED") {
			throwDecisionsError(
				"DC_INTENT_IMMUTABLE",
				"decision already submitted",
			);
		}
		if (decision.approvalPath) {
			if (
				decision.status !== "APPROVED" &&
				decision.status !== "CAPITAL_PENDING"
			) {
				throwDecisionsError(
					"DC_APPROVAL_REQUIRED",
					"human approval and disposition required",
				);
			}
			const disposition = await ctx.dispositions.findByDecisionId(decision.id);
			if (!disposition || disposition.dispositionKind !== "APPROVED") {
				throwDecisionsError(
					"DC_DISPOSITION_REQUIRED",
					"approved disposition required before submit",
				);
			}
			if (
				command.intentHash &&
				disposition.intentHash &&
				disposition.intentHash !== command.intentHash
			) {
				throwDecisionsError(
					"DC_DISPOSITION_INVALID",
					"intent hash does not match approved disposition",
				);
			}
		} else if (
			decision.status !== "AUTHORITY_CHECKED" &&
			decision.status !== "CAPITAL_PENDING" &&
			decision.status !== "RISK_PENDING" &&
			decision.status !== "DENIED"
		) {
			throwDecisionsError("DC_AUTHORITY_STALE", "authority not checked");
		}
		await assertSubmitPreconditionsMet(
			ctx.submitPreconditions,
			command.decisionId,
			command.organizationId,
			command.intentHash,
			deps.capitalReservationQuery,
		);
		const existingIntent = await ctx.tradeIntents.findByDecisionId(
			command.decisionId,
		);
		if (existingIntent) {
			throwDecisionsError("DC_INTENT_IMMUTABLE", "trade intent already exists");
		}
		const intentId = `dc_int_${randomUUID()}`;
		const savedIntent = await ctx.tradeIntents.save({
			id: intentId,
			decisionId: command.decisionId,
			organizationId: command.organizationId,
			intentHash: command.intentHash,
			instrumentId: command.instrumentId,
			side: command.side,
			quantity: command.quantity,
			price: command.price,
			executionMode: command.executionMode,
		});
		const updated = await ctx.decisions.updateStatus(
			decision.id,
			"SUBMITTED",
			decision.revision + 1,
		);
		await ctx.publishEvents([
			createIntentSubmittedEvent({
				decisionId: updated.id,
				intentId: savedIntent.id,
				organizationId: command.organizationId,
				intentHash: savedIntent.intentHash,
				instrumentId: savedIntent.instrumentId,
				side: savedIntent.side,
				quantity: savedIntent.quantity,
				price: savedIntent.price,
				executionMode: savedIntent.executionMode,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			decisionId: updated.id,
			intentId: savedIntent.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "submitIntent",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
