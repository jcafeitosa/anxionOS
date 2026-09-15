import { randomUUID } from "node:crypto";
import type {
	MarketDataCommandResult,
	RecordCorporateActionCommand,
} from "@anxionos/contracts/market-data";
import {
	marketDataCommandResultSchema,
	recordCorporateActionCommandSchema,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	createMarketDataCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwMarketDataError } from "../errors";

export interface RecordCorporateActionDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordCorporateAction(
	deps: RecordCorporateActionDeps,
	input: RecordCorporateActionCommand,
): Promise<MarketDataCommandResult> {
	const command = recordCorporateActionCommandSchema.parse(input);
	const intent = createMarketDataCommandIntent(
		"recordCorporateAction",
		command,
	);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.organizationId,
		command.commandId,
		intent,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		await ctx.lockIdempotencyKey(
			`${command.organizationId}:${command.commandId}`,
		);
		const raced = await loadIdempotentCommandResult(
			ctx.commandJournal,
			command.organizationId,
			command.commandId,
			intent,
		);
		if (raced) return raced;
		const instrument = await ctx.instruments.findById(
			command.instrumentId,
			command.organizationId,
		);
		if (!instrument) {
			throwMarketDataError(
				"MD_INSTRUMENT_NOT_FOUND",
				`Instrument ${command.instrumentId} not found`,
			);
		}
		if (command.adjustmentFactor !== undefined) {
			const factor = Number(command.adjustmentFactor);
			if (!(factor > 0)) {
				throwMarketDataError(
					"MD_INVALID_ADJUSTMENT_FACTOR",
					`adjustment_factor must be positive, got "${command.adjustmentFactor}"`,
				);
			}
		}
		const saved = await ctx.corporateActions.save({
			id: `md_ca_${randomUUID()}`,
			organization_id: command.organizationId,
			instrument_id: command.instrumentId,
			action_kind: command.actionKind,
			effective_date: command.effectiveDate,
			raw_payload: command.rawPayload,
			adjustment_factor: command.adjustmentFactor ?? null,
			source: command.source,
			recorded_at: new Date().toISOString(),
		});
		const result = marketDataCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			instrumentId: saved.instrument_id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordCorporateAction",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
