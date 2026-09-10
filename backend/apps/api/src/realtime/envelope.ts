import { randomUUID } from "node:crypto";
import {
	type RealtimeChannel,
	type RealtimeEnvelope,
	realtimeEnvelopeSchema,
} from "@anxionos/contracts/realtime";
import type { RealtimePublishInput } from "./types";

export function buildRealtimeEnvelope(
	input: RealtimePublishInput,
): RealtimeEnvelope {
	return realtimeEnvelopeSchema.parse({
		eventId: input.eventId ?? `rt_${randomUUID()}`,
		type: input.type,
		tenantId: input.tenantId,
		checkpoint: input.checkpoint,
		projectionGeneration: input.projectionGeneration,
		stale: input.stale ?? false,
		payload: input.payload,
		timestamp: new Date().toISOString(),
	});
}

export function envelopeMatchesChannel(
	envelope: RealtimeEnvelope,
	channel: RealtimeChannel,
): boolean {
	switch (channel) {
		case "health.deps":
			return envelope.type.startsWith("health.deps");
		case "dashboard.metrics":
			return envelope.type.startsWith("dashboard.metrics");
		case "session.revoked":
			return envelope.type.startsWith("session.revoked");
		case "notifications":
			return envelope.type.startsWith("notification.");
		default:
			return false;
	}
}
