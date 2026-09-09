import { z } from "zod";
import { executionModeSchema, instrumentIdSchema, observationKindSchema } from "./types";
export const connectionsMarketDataObservedSchema = z.object({
    eventId: z.string().uuid(),
    organizationId: z.string().uuid(),
    instrumentId: instrumentIdSchema.optional(),
    canonicalSymbol: z.string().min(1).max(64).optional(),
    observationKind: observationKindSchema,
    sourceEventId: z.string().uuid(),
    eventTime: z.string().datetime(),
    price: z.string().regex(/^\d+(\.\d+)?$/),
    volume: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    executionMode: executionModeSchema,
});
export function mapObservedToConfirmInput(observed: ConnectionsMarketDataObservedV1): ConfirmObservationInput | null {
    const parsed = connectionsMarketDataObservedSchema.parse(observed);
    if (!parsed.instrumentId) {
        return null;
    }
    return {
        organizationId: parsed.organizationId,
        instrumentId: parsed.instrumentId,
        observationKind: parsed.observationKind,
        sourceEventId: parsed.sourceEventId,
        eventTime: parsed.eventTime,
        price: parsed.price,
        volume: parsed.volume,
        executionMode: parsed.executionMode,
    };
}

export type ConnectionsMarketDataObservedV1 = z.infer<typeof connectionsMarketDataObservedSchema>;
export interface ConfirmObservationInput {
    organizationId: string;
    instrumentId: string;
    observationKind: ConnectionsMarketDataObservedV1["observationKind"];
    sourceEventId: string;
    eventTime: string;
    price: string;
    volume?: string;
    executionMode: ConnectionsMarketDataObservedV1["executionMode"];
}
