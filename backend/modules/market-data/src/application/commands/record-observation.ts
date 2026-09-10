import { randomUUID } from "node:crypto";
import type {
	MarketDataCommandResult,
	RecordObservationCommand,
} from "@anxionos/contracts/market-data";
import {
	marketDataCommandResultSchema,
	recordObservationCommandSchema,
} from "@anxionos/contracts/market-data";
import { createObservationRecordedEvent } from "../../domain/events/market-data-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwMarketDataError } from "../errors";

export interface RecordObservationDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordObservation(
	deps: RecordObservationDeps,
	input: RecordObservationCommand,
): Promise<MarketDataCommandResult> {
	const command = recordObservationCommandSchema.parse(input);
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
		const instrument = await ctx.instruments.findById(
			command.instrumentId,
			command.organizationId,
		);
		if (!instrument || instrument.status !== "ACTIVE") {
			throwMarketDataError(
				"MD_INSTRUMENT_NOT_FOUND",
				`Instrument ${command.instrumentId} not found`,
			);
		}
		const dup = await ctx.observations.findBySourceEventId(
			command.organizationId,
			command.sourceEventId,
		);
		if (dup) {
			const result = marketDataCommandResultSchema.parse({
				aggregateId: dup.id,
				revision: 1,
				observationHeaderId: dup.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "recordObservation",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		const headerId = `md_obs_${randomUUID()}`;
		await ctx.observations.saveHeader({
			id: headerId,
			organizationId: command.organizationId,
			instrumentId: command.instrumentId,
			observationKind: command.observationKind,
			sourceEventId: command.sourceEventId,
			eventTime: command.eventTime,
			price: command.price,
			volume: command.volume ?? null,
			executionMode: command.executionMode,
			qualityFlag: command.qualityFlag,
		});
		await ctx.observations.insertTimeseries({
			eventTime: command.eventTime,
			organizationId: command.organizationId,
			instrumentId: command.instrumentId,
			observationHeaderId: headerId,
			observationKind: command.observationKind,
			price: command.price,
			volume: command.volume ?? null,
		});
		await ctx.publishEvents([
			createObservationRecordedEvent({
				observationHeaderId: headerId,
				instrumentId: command.instrumentId,
				observationKind: command.observationKind,
				sourceEventId: command.sourceEventId,
				eventTime: command.eventTime,
				price: command.price,
			}),
		]);
		const result = marketDataCommandResultSchema.parse({
			aggregateId: headerId,
			revision: 1,
			observationHeaderId: headerId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordObservation",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
