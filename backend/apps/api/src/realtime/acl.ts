import type { RealtimeChannel } from "@anxionos/contracts/realtime";
import type { RealtimeSessionContext } from "./types";

const DEFAULT_MAX_CHANNELS = 8;
const DEFAULT_MAX_CONNECTIONS = 4;
const DEFAULT_MAX_PENDING = 64;

export function resolveRealtimeMaxChannelsPerConnection(): number {
	const raw = process.env.REALTIME_MAX_CHANNELS_PER_CONNECTION?.trim();
	if (!raw) return DEFAULT_MAX_CHANNELS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_CHANNELS;
}

export function resolveRealtimeMaxConnectionsPerUser(): number {
	const raw = process.env.REALTIME_MAX_CONNECTIONS_PER_USER?.trim();
	if (!raw) return DEFAULT_MAX_CONNECTIONS;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0
		? parsed
		: DEFAULT_MAX_CONNECTIONS;
}

export function resolveRealtimeMaxPendingEvents(): number {
	const raw = process.env.REALTIME_MAX_PENDING_EVENTS?.trim();
	if (!raw) return DEFAULT_MAX_PENDING;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_PENDING;
}

export function canSubscribeChannel(
	ctx: RealtimeSessionContext,
	channel: RealtimeChannel,
): boolean {
	switch (channel) {
		case "health.deps":
		case "dashboard.metrics":
		case "notifications":
			return true;
		case "session.revoked":
			return ctx.tenantId === ctx.userId;
		default:
			return false;
	}
}

export function filterAllowedChannels(
	ctx: RealtimeSessionContext,
	channels: RealtimeChannel[],
): RealtimeChannel[] {
	const max = resolveRealtimeMaxChannelsPerConnection();
	const allowed = channels.filter((channel) =>
		canSubscribeChannel(ctx, channel),
	);
	return [...new Set(allowed)].slice(0, max);
}
