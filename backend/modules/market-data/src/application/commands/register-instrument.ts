import { randomUUID } from "node:crypto";
import type {
	MarketDataCommandResult,
	RegisterInstrumentCommand,
} from "@anxionos/contracts/market-data";
import {
	marketDataCommandResultSchema,
	registerInstrumentCommandSchema,
} from "@anxionos/contracts/market-data";
import { createInstrumentRegisteredEvent } from "../../domain/events/market-data-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	createMarketDataCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";

export interface RegisterInstrumentDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerInstrument(
	deps: RegisterInstrumentDeps,
	input: RegisterInstrumentCommand,
): Promise<MarketDataCommandResult> {
	const command = registerInstrumentCommandSchema.parse(input);
	const intent = createMarketDataCommandIntent("registerInstrument", command);
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
		const existing = await ctx.instruments.findActiveByNaturalKey(
			command.organizationId,
			command.canonicalSymbol,
			command.venueId,
		);
		if (existing) {
			const result = marketDataCommandResultSchema.parse({
				aggregateId: existing.id,
				revision: existing.revision,
				instrumentId: existing.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerInstrument",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const instrumentId = `md_ins_${randomUUID()}`;
		const saved = await ctx.instruments.save({
			id: instrumentId,
			organizationId: command.organizationId,
			canonicalSymbol: command.canonicalSymbol,
			instrumentKind: command.instrumentKind,
			assetId: command.assetId,
			venueId: command.venueId,
			executionMode: command.executionMode,
			status: "ACTIVE",
			revision: 1,
		});
		if (saved.id !== instrumentId) {
			// Lost a concurrent race against another registerInstrument for the
			// same natural key: the DB-level unique index (D-MD-001) caught what
			// the earlier findActiveByNaturalKey check could not. Treat exactly
			// like the "existing" branch above instead of fabricating a second
			// ACTIVE instrument or surfacing a raw unique_violation.
			const result = marketDataCommandResultSchema.parse({
				aggregateId: saved.id,
				revision: saved.revision,
				instrumentId: saved.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "registerInstrument",
				requestHash: intent.requestHash,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		await ctx.publishEvents([
			createInstrumentRegisteredEvent({
				instrumentId: saved.id,
				organizationId: saved.organizationId,
				canonicalSymbol: saved.canonicalSymbol,
				instrumentKind: saved.instrumentKind,
			}),
		]);
		const result = marketDataCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			instrumentId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerInstrument",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
