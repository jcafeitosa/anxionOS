import { randomUUID } from "node:crypto";
import type {
	MarketDataCommandResult,
	RecordFxRateCommand,
} from "@anxionos/contracts/market-data";
import {
	marketDataCommandResultSchema,
	recordFxRateCommandSchema,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";

export interface RecordFxRateDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordFxRate(
	deps: RecordFxRateDeps,
	input: RecordFxRateCommand,
): Promise<MarketDataCommandResult> {
	const command = recordFxRateCommandSchema.parse(input);
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
		const saved = await ctx.marketDataFxRates.save({
			id: `md_fx_${randomUUID()}`,
			base_currency: command.baseCurrency,
			quote_currency: command.quoteCurrency,
			rate: command.rate,
			as_of: command.asOf,
			source: command.source,
			created_at: new Date().toISOString(),
		});
		const result = marketDataCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordFxRate",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
