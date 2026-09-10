const DEFAULT_MAX_STREAMS_PER_TENANT = 32;
const DEFAULT_MAX_EVENTS_PER_STREAM_PER_WINDOW = 1_000;
const DEFAULT_BACKPRESSURE_WINDOW_MS = 1_000;
const DEFAULT_RECONNECT_DEDUPE_WINDOW = 4_096;
const DEFAULT_SEQUENCE_GAP_THRESHOLD_MS = 30_000;

function parsePositiveInt(raw: string | undefined, fallback: number): number {
	if (!raw?.trim()) return fallback;
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Max distinct realtime ingest streams tracked per tenant (ANX-329 S3a). */
export function resolveMaxStreamsPerTenant(): number {
	return parsePositiveInt(
		process.env.MARKET_DATA_MAX_STREAMS_PER_TENANT?.trim(),
		DEFAULT_MAX_STREAMS_PER_TENANT,
	);
}

/** Max observed events per tenant+stream within the backpressure window. */
export function resolveMaxEventsPerStreamPerWindow(): number {
	return parsePositiveInt(
		process.env.MARKET_DATA_MAX_EVENTS_PER_STREAM_PER_WINDOW?.trim(),
		DEFAULT_MAX_EVENTS_PER_STREAM_PER_WINDOW,
	);
}

/** Sliding window length for ingest flood detection (milliseconds). */
export function resolveBackpressureWindowMs(): number {
	return parsePositiveInt(
		process.env.MARKET_DATA_BACKPRESSURE_WINDOW_MS?.trim(),
		DEFAULT_BACKPRESSURE_WINDOW_MS,
	);
}

/** Max transport/source fingerprints retained per stream across reconnect (ANX-329 S3b). */
export function resolveReconnectDedupeWindow(): number {
	return parsePositiveInt(
		process.env.MARKET_DATA_RECONNECT_DEDUPE_WINDOW?.trim(),
		DEFAULT_RECONNECT_DEDUPE_WINDOW,
	);
}

/** Max elapsed eventTime between consecutive ticks before flagging a gap (ANX-329 S3d). */
export function resolveSequenceGapThresholdMs(): number {
	return parsePositiveInt(
		process.env.MARKET_DATA_SEQUENCE_GAP_THRESHOLD_MS?.trim(),
		DEFAULT_SEQUENCE_GAP_THRESHOLD_MS,
	);
}

/** When true, sequence anomalies reject ingest instead of qualityFlag only. */
export function resolveSequenceRejectAnomalies(): boolean {
	const raw = process.env.MARKET_DATA_SEQUENCE_REJECT_ANOMALIES?.trim();
	return raw === "1" || raw?.toLowerCase() === "true";
}

export const MARKET_DATA_REALTIME_LIMIT_DEFAULTS = {
	maxStreamsPerTenant: DEFAULT_MAX_STREAMS_PER_TENANT,
	maxEventsPerStreamPerWindow: DEFAULT_MAX_EVENTS_PER_STREAM_PER_WINDOW,
	backpressureWindowMs: DEFAULT_BACKPRESSURE_WINDOW_MS,
	reconnectDedupeWindow: DEFAULT_RECONNECT_DEDUPE_WINDOW,
	sequenceGapThresholdMs: DEFAULT_SEQUENCE_GAP_THRESHOLD_MS,
} as const;
