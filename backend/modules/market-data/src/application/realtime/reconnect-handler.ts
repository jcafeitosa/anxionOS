import { resolveReconnectDedupeWindow } from "../../domain/realtime-ingest-limits";

export type ReconnectSkipReason =
	| "DUPLICATE_TRANSPORT_EVENT_ID"
	| "DUPLICATE_SOURCE_EVENT_ID";

export type ReconnectAdmissionDecision =
	| { action: "admit" }
	| { action: "skip"; reason: ReconnectSkipReason };

export type ReconnectConnectionPhase = "active" | "reconnecting";

export interface RealtimeIngestEventFingerprint {
	eventId: string;
	sourceEventId: string;
}

export interface RealtimeIngestStreamSnapshot {
	streamId: string;
	phase: ReconnectConnectionPhase;
	connectionGeneration: number;
	seenTransportEventCount: number;
	seenSourceEventCount: number;
	lastDisconnectedAt: number | null;
}

export interface RealtimeIngestReconnectHandlerOptions {
	dedupeWindow?: number;
	now?: () => number;
}

interface StreamReconnectState {
	phase: ReconnectConnectionPhase;
	connectionGeneration: number;
	seenTransportEventIds: string[];
	seenSourceEventIds: string[];
	lastDisconnectedAt: number | null;
}

/**
 * Session-scoped reconnect guard for realtime ingest (G5-MD-03 / ANX-329 S3b).
 * Complements persistence-level sourceEventId dedupe (slice 1-2) by rejecting
 * transport replays before they reach recordObservation during reconnect floods.
 */
export class RealtimeIngestReconnectHandler {
	private readonly now: () => number;
	private readonly dedupeWindow: number;
	private readonly streams = new Map<string, StreamReconnectState>();

	constructor(options: RealtimeIngestReconnectHandlerOptions = {}) {
		this.now = options.now ?? (() => Date.now());
		this.dedupeWindow = options.dedupeWindow ?? resolveReconnectDedupeWindow();
	}

	registerStream(tenantId: string, streamId: string): void {
		const key = this.streamKey(tenantId, streamId);
		if (this.streams.has(key)) return;
		this.streams.set(key, this.freshStreamState());
	}

	markDisconnected(tenantId: string, streamId: string): void {
		const stream = this.ensureStream(tenantId, streamId);
		stream.phase = "reconnecting";
		stream.lastDisconnectedAt = this.now();
	}

	onReconnect(
		tenantId: string,
		streamId: string,
	): {
		connectionGeneration: number;
	} {
		const stream = this.ensureStream(tenantId, streamId);
		stream.phase = "active";
		stream.connectionGeneration += 1;
		stream.lastDisconnectedAt = null;
		return { connectionGeneration: stream.connectionGeneration };
	}

	admitEvent(
		tenantId: string,
		streamId: string,
		fingerprint: RealtimeIngestEventFingerprint,
	): ReconnectAdmissionDecision {
		const stream = this.ensureStream(tenantId, streamId);
		if (this.contains(stream.seenTransportEventIds, fingerprint.eventId)) {
			return {
				action: "skip",
				reason: "DUPLICATE_TRANSPORT_EVENT_ID",
			};
		}
		if (this.contains(stream.seenSourceEventIds, fingerprint.sourceEventId)) {
			return {
				action: "skip",
				reason: "DUPLICATE_SOURCE_EVENT_ID",
			};
		}
		this.remember(stream.seenTransportEventIds, fingerprint.eventId);
		this.remember(stream.seenSourceEventIds, fingerprint.sourceEventId);
		if (stream.phase === "reconnecting") {
			stream.phase = "active";
		}
		return { action: "admit" };
	}

	releaseStream(tenantId: string, streamId: string): void {
		this.streams.delete(this.streamKey(tenantId, streamId));
	}

	snapshot(
		tenantId: string,
		streamId: string,
	): RealtimeIngestStreamSnapshot | null {
		const stream = this.streams.get(this.streamKey(tenantId, streamId));
		if (!stream) return null;
		return {
			streamId,
			phase: stream.phase,
			connectionGeneration: stream.connectionGeneration,
			seenTransportEventCount: stream.seenTransportEventIds.length,
			seenSourceEventCount: stream.seenSourceEventIds.length,
			lastDisconnectedAt: stream.lastDisconnectedAt,
		};
	}

	private ensureStream(
		tenantId: string,
		streamId: string,
	): StreamReconnectState {
		const key = this.streamKey(tenantId, streamId);
		let stream = this.streams.get(key);
		if (!stream) {
			stream = this.freshStreamState();
			this.streams.set(key, stream);
		}
		return stream;
	}

	private freshStreamState(): StreamReconnectState {
		return {
			phase: "active",
			connectionGeneration: 1,
			seenTransportEventIds: [],
			seenSourceEventIds: [],
			lastDisconnectedAt: null,
		};
	}

	private streamKey(tenantId: string, streamId: string): string {
		return `${tenantId}:${streamId}`;
	}

	private contains(window: string[], value: string): boolean {
		return window.includes(value);
	}

	private remember(window: string[], value: string): void {
		window.push(value);
		if (window.length > this.dedupeWindow) {
			window.splice(0, window.length - this.dedupeWindow);
		}
	}
}
