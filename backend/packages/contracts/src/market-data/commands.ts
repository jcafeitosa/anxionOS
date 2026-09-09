import { z } from "zod";
import { executionModeSchema, instrumentIdSchema, instrumentKindSchema, observationKindSchema, } from "./types";
export const marketDataCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    instrumentId: instrumentIdSchema.optional(),
    observationHeaderId: z.string().optional(),
});
export const registerInstrumentCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    canonicalSymbol: z.string().min(1).max(64),
    instrumentKind: instrumentKindSchema,
    assetId: z.string().min(1).max(64),
    venueId: z.string().min(1).max(64),
    executionMode: executionModeSchema,
});
export const recordObservationCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    instrumentId: instrumentIdSchema,
    observationKind: observationKindSchema,
    sourceEventId: z.string().uuid(),
    eventTime: z.string().datetime(),
    price: z.string().regex(/^\d+(\.\d+)?$/),
    volume: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    executionMode: executionModeSchema,
    qualityFlag: z.enum(["OK", "STALE", "ESTIMATED"]).default("OK"),
});

export type MarketDataCommandResult = z.infer<typeof marketDataCommandResultSchema>;

export type RegisterInstrumentCommand = z.infer<typeof registerInstrumentCommandSchema>;

export type RecordObservationCommand = z.infer<typeof recordObservationCommandSchema>;
