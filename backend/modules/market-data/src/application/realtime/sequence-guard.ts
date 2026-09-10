import { resolveSequenceGapThresholdMs } from "../../domain/realtime-ingest-limits";

export type SequenceAnomalyReason =
	| "OUT_OF_ORDER_EVENT_TIME"
	| "EVENT_TIME_GAP"
	| "OUT_OF_ORDER_STREAM_SEQUENCE"
	| "STREAM_SEQUENCE_GAP";

export type SequenceQualityFlag = "OK" | "STALE" | "ESTIMATED";

export type SequenceAdmissionDecision =
	| { action: "admit"; qualityFlag: SequenceQualityFlag }
	| { action: "reject"; reason: SequenceAnomalyReason };

export type SequenceConnectionPhase = "active" | "reconnecting";

export interface RealtimeIngestSequenceEvent {
	eventTime: string;
	streamSequence?: number;
}

export interface RealtimeIngestSequenceStreamSnapshot {
	streamId: string;
	phase: SequenceConnectionPhase;
	lastEventTime: string | null;
	lastStreamSequence: number | null;
	awaitingResync: boolean;
}

export interface RealtimeIngestSequenceGuardOptions {
	gapThresholdMs?: number;
	rejectAnomalies?: boolean;
	now?: () => number;
}

interface StreamSequenceState {
	phase: SequenceConnectionPhase;
	lastEventTimeMs: number | null;
	lastStreamSequence: number | null;
	awaitingResync: boolean;
}

/**
 * Session-scoped sequence guard for realtime ingest (G5-MD-03 / ANX-329 S3d).
 * Detects event-time gaps and out-of-order delivery per tenant+stream.
 * Anomalies surface via qualityFlag (STALE/ESTIMATED) unless rejectAnomalies is set.
 */
export class RealtimeIngestSequenceGuard {
	private readonly now: () => number;
	private readonly gapThresholdMs: number;
	private readonly rejectAnomalies: boolean;
	private readonly streams = new Map<string, StreamSequenceState>();

	constructor(options: RealtimeIngestSequenceGuardOptions = {}) {
		this.now = options.now ?? (() => Date.now());
		this.gapThresholdMs =
			options.gapThresholdMs ?? resolveSequenceGapThresholdMs();
		this.rejectAnomalies = options.rejectAnomalies ?? false;
	}

	registerStream(tenantId: string, streamId: string): void {
		const key = this.streamKey(tenantId, streamId);
		if (this.streams.has(key)) return;
		this.streams.set(key, this.freshStreamState());
	}

	markDisconnected(tenantId: string, streamId: string): void {
		const stream = this.ensureStream(tenantId, streamId);
		stream.phase = "reconnecting";
	}

	onReconnect(tenantId: string, streamId: string): void {
		const stream = this.ensureStream(tenantId, streamId);
		stream.phase = "active";
		stream.awaitingResync = true;
	}

	admitEvent(
		tenantId: string,
		streamId: string,
		event: RealtimeIngestSequenceEvent,
	): SequenceAdmissionDecision {
		const stream = this.ensureStream(tenantId, streamId);
		if (stream.phase === "reconnecting") {
			stream.phase = "active";
		}
		const eventTimeMs = Date.parse(event.eventTime);
		if (Number.isNaN(eventTimeMs)) {
			return this.rejectOrFlag("OUT_OF_ORDER_EVENT_TIME", "ESTIMATED");
		}

		let qualityFlag: SequenceQualityFlag = "OK";
		let rejectReason: SequenceAnomalyReason | null = null;

		if (event.streamSequence !== undefined) {
			const sequenceAnomaly = this.evaluateStreamSequence(
				stream,
				event.streamSequence,
			);
			if (sequenceAnomaly) {
				if (this.rejectAnomalies) {
					return { action: "reject", reason: sequenceAnomaly };
				}
				rejectReason = sequenceAnomaly;
				qualityFlag = this.qualityForSequenceAnomaly(sequenceAnomaly);
			}
			if (
				sequenceAnomaly !== "OUT_OF_ORDER_STREAM_SEQUENCE" &&
				(event.streamSequence > (stream.lastStreamSequence ?? -1))
			) {
				stream.lastStreamSequence = event.streamSequence;
			}
		}

		if (stream.lastEventTimeMs !== null) {
			if (eventTimeMs < stream.lastEventTimeMs) {
				const reason: SequenceAnomalyReason = "OUT_OF_ORDER_EVENT_TIME";
				if (this.rejectAnomalies) {
					return { action: "reject", reason };
				}
				rejectReason = reason;
				qualityFlag = this.mergeQuality(qualityFlag, "ESTIMATED");
			} else {
				const deltaMs = eventTimeMs - stream.lastEventTimeMs;
				if (deltaMs > this.gapThresholdMs) {
					const reason: SequenceAnomalyReason = "EVENT_TIME_GAP";
					if (this.rejectAnomalies) {
						return { action: "reject", reason };
					}
					rejectReason = reason;
					qualityFlag = this.mergeQuality(qualityFlag, "STALE");
				}
				stream.lastEventTimeMs = eventTimeMs;
			}
		} else {
			if (stream.awaitingResync) {
				qualityFlag = this.mergeQuality(qualityFlag, "STALE");
			}
			stream.lastEventTimeMs = eventTimeMs;
		}

		stream.awaitingResync = false;
		if (rejectReason && this.rejectAnomalies) {
			return { action: "reject", reason: rejectReason };
		}
		return { action: "admit", qualityFlag };
	}

	releaseStream(tenantId: string, streamId: string): void {
		this.streams.delete(this.streamKey(tenantId, streamId));
	}

	snapshot(
		tenantId: string,
		streamId: string,
	): RealtimeIngestSequenceStreamSnapshot | null {
		const stream = this.streams.get(this.streamKey(tenantId, streamId));
		if (!stream) return null;
		return {
			streamId,
			phase: stream.phase,
			lastEventTime:
				stream.lastEventTimeMs === null
					? null
					: new Date(stream.lastEventTimeMs).toISOString(),
			lastStreamSequence: stream.lastStreamSequence,
			awaitingResync: stream.awaitingResync,
		};
	}

	private evaluateStreamSequence(
		stream: StreamSequenceState,
		streamSequence: number,
	): SequenceAnomalyReason | null {
		if (stream.lastStreamSequence === null) {
			return null;
		}
		if (streamSequence <= stream.lastStreamSequence) {
			return "OUT_OF_ORDER_STREAM_SEQUENCE";
		}
		if (streamSequence > stream.lastStreamSequence + 1) {
			return "STREAM_SEQUENCE_GAP";
		}
		return null;
	}

	private qualityForSequenceAnomaly(
		reason: SequenceAnomalyReason,
	): SequenceQualityFlag {
		switch (reason) {
			case "OUT_OF_ORDER_STREAM_SEQUENCE":
			case "OUT_OF_ORDER_EVENT_TIME":
				return "ESTIMATED";
			case "STREAM_SEQUENCE_GAP":
			case "EVENT_TIME_GAP":
				return "STALE";
			default: {
				const _exhaustive: never = reason;
				return _exhaustive;
			}
		}
	}

	private mergeQuality(
		current: SequenceQualityFlag,
		next: SequenceQualityFlag,
	): SequenceQualityFlag {
		if (current === "STALE" || next === "STALE") return "STALE";
		if (current === "ESTIMATED" || next === "ESTIMATED") return "ESTIMATED";
		return "OK";
	}

	private rejectOrFlag(
		reason: SequenceAnomalyReason,
		flag: SequenceQualityFlag,
	): SequenceAdmissionDecision {
		if (this.rejectAnomalies) {
			return { action: "reject", reason };
		}
		return { action: "admit", qualityFlag: flag };
	}

	private ensureStream(
		tenantId: string,
		streamId: string,
	): StreamSequenceState {
		const key = this.streamKey(tenantId, streamId);
		let stream = this.streams.get(key);
		if (!stream) {
			stream = this.freshStreamState();
			this.streams.set(key, stream);
		}
		return stream;
	}

	private freshStreamState(): StreamSequenceState {
		return {
			phase: "active",
			lastEventTimeMs: null,
			lastStreamSequence: null,
			awaitingResync: false,
		};
	}

	private streamKey(tenantId: string, streamId: string): string {
		return `${tenantId}:${streamId}`;
	}
}
