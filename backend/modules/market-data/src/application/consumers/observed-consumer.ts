import { randomUUID } from "node:crypto";
import {
	type ConnectionsMarketDataObservedV1,
	type MarketDataCommandResult,
	mapObservedToConfirmInput,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import { recordObservation } from "../commands/record-observation";

export interface ObservedConsumerDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createMarketDataObservedConsumer(deps: ObservedConsumerDeps): {
	handle(
		observed: ConnectionsMarketDataObservedV1,
	): Promise<MarketDataCommandResult | null>;
} {
	return {
		async handle(observed: ConnectionsMarketDataObservedV1) {
			const confirm = mapObservedToConfirmInput(observed);
			if (!confirm) {
				return null;
			}
			return recordObservation(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				{
					commandId: randomUUID(),
					organizationId: confirm.organizationId,
					instrumentId: confirm.instrumentId,
					observationKind: confirm.observationKind,
					sourceEventId: confirm.sourceEventId,
					eventTime: confirm.eventTime,
					price: confirm.price,
					volume: confirm.volume,
					executionMode: confirm.executionMode,
					qualityFlag: "OK",
				},
			);
		},
	};
}
