import { randomUUID } from "node:crypto";
import type {
	MarketDataCommandResult,
	StartBackfillCommand,
} from "@anxionos/contracts/market-data";
import {
	marketDataCommandResultSchema,
	startBackfillCommandSchema,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	createMarketDataCommandIntent,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { throwMarketDataError } from "../errors";

export {
	type StartBackfillCommand,
	startBackfillCommandSchema,
} from "@anxionos/contracts/market-data";

export interface StartBackfillDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function startBackfill(
	deps: StartBackfillDeps,
	input: StartBackfillCommand,
): Promise<MarketDataCommandResult> {
	const command = startBackfillCommandSchema.parse(input);
	const intent = createMarketDataCommandIntent("startBackfill", command);
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
		if (instrument.status !== "ACTIVE") {
			throwMarketDataError(
				"MD_BACKFILL_LICENSE_DENIED",
				`Instrument ${command.instrumentId} status is "${instrument.status}", expected "ACTIVE"`,
			);
		}
		if (instrument.executionMode !== command.executionMode) {
			throwMarketDataError(
				"MD_EXECUTION_MODE_NOT_SUPPORTED",
				`Execution mode ${command.executionMode} is not supported for instrument ${command.instrumentId} (instrument mode is ${instrument.executionMode})`,
			);
		}
		const active = await ctx.backfillJobs.findActiveByInstrument(
			command.organizationId,
			command.instrumentId,
		);
		if (
			active &&
			(active.requestedFrom !== command.requestedFrom ||
				active.requestedTo !== command.requestedTo)
		) {
			throwMarketDataError(
				"MD_BACKFILL_INVALID_TRANSITION",
				`Instrument ${command.instrumentId} already has an in-flight backfill ${active.id}`,
			);
		}
		const now = new Date().toISOString();
		const job = await ctx.backfillJobs.save({
			id: `md_bf_${randomUUID()}`,
			organizationId: command.organizationId,
			instrumentId: command.instrumentId,
			requestedFrom: command.requestedFrom,
			requestedTo: command.requestedTo,
			cursorPosition: null,
			status: "PENDING",
			lastError: null,
			rowsIngested: 0,
			createdAt: now,
			updatedAt: now,
		});
		const result = marketDataCommandResultSchema.parse({
			aggregateId: job.id,
			revision: 1,
			instrumentId: job.instrumentId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "startBackfill",
			requestHash: intent.requestHash,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
