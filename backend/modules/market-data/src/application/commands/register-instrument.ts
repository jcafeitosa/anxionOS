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
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RegisterInstrumentDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerInstrument(
	deps: RegisterInstrumentDeps,
	input: RegisterInstrumentCommand,
): Promise<MarketDataCommandResult> {
	const command = registerInstrumentCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return marketDataCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
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
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
