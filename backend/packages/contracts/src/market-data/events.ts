import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { instrumentIdSchema, observationKindSchema } from "./types";
export const MARKET_DATA_EVENT_TYPES = {
	INSTRUMENT_REGISTERED: "market_data.instrument.registered.v1",
	OBSERVATION_RECORDED: "market_data.observation.recorded.v1",
};
export const instrumentRegisteredPayloadSchema = z.object({
	instrumentId: instrumentIdSchema,
	organizationId: institutionalUuidSchema,
	canonicalSymbol: z.string().min(1),
	instrumentKind: z.string().min(1),
});
export const observationRecordedPayloadSchema = z.object({
	observationHeaderId: z.string().min(1),
	instrumentId: instrumentIdSchema,
	observationKind: observationKindSchema,
	sourceEventId: institutionalUuidSchema,
	eventTime: z.string().datetime(),
	price: z.string().min(1),
});
export const marketDataEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(MARKET_DATA_EVENT_TYPES.INSTRUMENT_REGISTERED),
		payload: instrumentRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(MARKET_DATA_EVENT_TYPES.OBSERVATION_RECORDED),
		payload: observationRecordedPayloadSchema,
	}),
]);

export type MarketDataEventType =
	(typeof MARKET_DATA_EVENT_TYPES)[keyof typeof MARKET_DATA_EVENT_TYPES];
