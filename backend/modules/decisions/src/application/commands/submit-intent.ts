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
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwDecisionsError } from "../errors";

export interface SubmitIntentDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function submitIntent(
	deps: SubmitIntentDeps,
	input: SubmitIntentCommand,
): Promise<DecisionsCommandResult> {
	const command = submitIntentCommandSchema.parse(input);
	assertDecisionsExecutionModeSupported(command.executionMode);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwDecisionsError(
			"DC_CROSS_TENANT",
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
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return decisionsCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const decision = await ctx.decisions.findById(command.decisionId);
		if (!decision || decision.organizationId !== command.organizationId) {
			throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
		}
		if (decision.status !== "AUTHORITY_CHECKED") {
			if (decision.status === "SUBMITTED") {
				throwDecisionsError(
					"DC_INTENT_IMMUTABLE",
					"decision already submitted",
				);
			}
			throwDecisionsError("DC_AUTHORITY_STALE", "authority not checked");
		}
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
