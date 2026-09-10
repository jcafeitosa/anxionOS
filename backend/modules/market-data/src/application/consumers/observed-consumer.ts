import { randomUUID } from "node:crypto";
import {
	type ConnectionsMarketDataObservedV1,
	type MarketDataCommandResult,
	mapObservedToConfirmInput,
} from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";
import { recordObservation } from "../commands/record-observation";
import { throwMarketDataError } from "../errors";
import type { RealtimeIngestBackpressureHandler } from "../realtime/backpressure-handler";
import {
	createDefaultRealtimeIngestGate,
	evaluateRealtimeIngestGate,
	type RealtimeIngestGateDeps,
} from "../realtime/ingest-gate";
import type { RealtimeIngestReconnectHandler } from "../realtime/reconnect-handler";
import type { RealtimeIngestSequenceGuard } from "../realtime/sequence-guard";

export interface ObservedConsumerRealtimeDeps {
	backpressure: RealtimeIngestBackpressureHandler;
	reconnect: RealtimeIngestReconnectHandler;
	sequence: RealtimeIngestSequenceGuard;
}

export interface ObservedConsumerDeps {
	unitOfWork: MarketDataUnitOfWork;
	commandJournal: CommandJournalRepository;
	realtime?: RealtimeIngestGateDeps;
}

function resolveStreamId(instrumentId: string): string {
	return instrumentId;
}

export function createMarketDataObservedConsumer(deps: ObservedConsumerDeps): {
	handle(
		observed: ConnectionsMarketDataObservedV1,
	): Promise<MarketDataCommandResult | null>;
} {
	const realtime = deps.realtime ?? createDefaultRealtimeIngestGate();
	return {
		async handle(observed: ConnectionsMarketDataObservedV1) {
			const confirm = mapObservedToConfirmInput(observed);
			if (!confirm) {
				return null;
			}
			const streamId = resolveStreamId(confirm.instrumentId);
			const gate = evaluateRealtimeIngestGate(realtime, {
				organizationId: confirm.organizationId,
				streamId,
				eventId: observed.eventId,
				sourceEventId: confirm.sourceEventId,
				eventTime: confirm.eventTime,
			});
			if (gate.action === "skip") {
				return null;
			}
			if (gate.action === "reject") {
				const code =
					gate.reason === "TENANT_STREAM_QUOTA_EXCEEDED" ||
					gate.reason === "STREAM_EVENT_QUOTA_EXCEEDED"
						? "MD_INGEST_BACKPRESSURE"
						: "MD_INGEST_SEQUENCE_VIOLATION";
				throwMarketDataError(
					code,
					`Realtime ingest rejected for stream ${streamId}: ${gate.reason}`,
				);
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
					qualityFlag: gate.qualityFlag,
				},
			);
		},
	};
}
