import { z } from "zod";
/** Allowed realtime channel identifiers (server allowlist). */
export const realtimeChannelSchema = z.enum([
	"health.deps",
	"dashboard.metrics",
	"notifications",
	"session.revoked",
]);
export const REALTIME_CHANNELS = realtimeChannelSchema.options;
export const realtimeEnvelopeSchema = z.object({
	eventId: z.string().min(1),
	type: z.string().min(1),
	tenantId: z.string().min(1),
	checkpoint: z.string().optional(),
	projectionGeneration: z.number().int().nonnegative().optional(),
	stale: z.boolean(),
	payload: z.unknown(),
	timestamp: z.string().datetime(),
});
export const realtimeWsMessageSchema = z.object({
	op: z.enum(["subscribe", "unsubscribe", "ping"]),
	channels: z.array(realtimeChannelSchema).default([]),
});

export type RealtimeChannel = z.infer<typeof realtimeChannelSchema>;

export type RealtimeEnvelope = z.infer<typeof realtimeEnvelopeSchema>;

export type RealtimeWsMessage = z.infer<typeof realtimeWsMessageSchema>;
