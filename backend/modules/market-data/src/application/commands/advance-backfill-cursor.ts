import type {
	AdvanceBackfillCursorCommand,
	MarketDataCommandResult,
} from "@anxionos/contracts/market-data";
import {
	advanceBackfillCursorCommandSchema,
	marketDataCommandResultSchema,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwMarketDataError } from "../errors";

export {
	type AdvanceBackfillCursorCommand,
	advanceBackfillCursorCommandSchema,
} from "@anxionos/contracts/market-data";

export interface AdvanceBackfillCursorDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function advanceBackfillCursor(
	deps: AdvanceBackfillCursorDeps,
	input: AdvanceBackfillCursorCommand,
): Promise<MarketDataCommandResult> {
	const command = advanceBackfillCursorCommandSchema.parse(input);
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
		const existing = await ctx.backfillJobs.findById(
			command.jobId,
			command.organizationId,
		);
		if (!existing) {
			throwMarketDataError(
				"MD_BACKFILL_JOB_NOT_FOUND",
				`Backfill job ${command.jobId} not found`,
			);
		}
		if (existing.status === "COMPLETED" || existing.status === "FAILED") {
			throwMarketDataError(
				"MD_BACKFILL_INVALID_TRANSITION",
				`Cannot advance backfill job ${command.jobId}: current status is "${existing.status}"`,
			);
		}
		const advanced = await ctx.backfillJobs.advanceCursor({
			id: command.jobId,
			organizationId: command.organizationId,
			cursorPosition: command.cursorPosition ?? null,
			rowsIngested: command.rowsIngested,
			status: command.status,
			lastError: command.lastError ?? null,
		});
		if (!advanced) {
			throwMarketDataError(
				"MD_BACKFILL_INVALID_TRANSITION",
				`Cannot advance backfill job ${command.jobId}: job is in state "${existing.status}"`,
			);
		}
		const result = marketDataCommandResultSchema.parse({
			aggregateId: advanced.id,
			revision: advanced.rowsIngested,
			instrumentId: advanced.instrumentId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "advanceBackfillCursor",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
