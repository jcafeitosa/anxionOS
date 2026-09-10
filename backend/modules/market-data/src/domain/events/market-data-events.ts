import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	MARKET_DATA_EVENT_TYPES,
	MARKET_DATA_OWNER_DOMAIN,
} from "@anxionos/contracts/market-data";

export function createInstrumentRegisteredEvent(input: {
	instrumentId: string;
	organizationId: string;
	canonicalSymbol: string;
	instrumentKind: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: MARKET_DATA_EVENT_TYPES.INSTRUMENT_REGISTERED,
		schemaVersion: "0.1.0",
		ownerDomain: MARKET_DATA_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createObservationRecordedEvent(input: {
	observationHeaderId: string;
	instrumentId: string;
	observationKind: string;
	sourceEventId: string;
	eventTime: string;
	price: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: MARKET_DATA_EVENT_TYPES.OBSERVATION_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: MARKET_DATA_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
