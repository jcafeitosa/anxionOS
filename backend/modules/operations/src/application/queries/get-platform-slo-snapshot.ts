import {
	PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION,
	type PlatformSloEventingLag,
	type PlatformSloRouteLatency,
	type PlatformSloSnapshot,
	platformSloSnapshotSchema,
} from "@anxionos/contracts/operations";
import type { MetricsCollector } from "@anxionos/observability";
import { percentile } from "@anxionos/observability";
import { parseMetricKey } from "../../domain/instrumentation/metrics-redaction";

const API_REQUESTS_METRIC = "api.requests";
const API_ERRORS_METRIC = "api.errors";
const API_LATENCY_METRIC = "api.latency";
const EVENTING_LAG_METRIC = "operations.eventing.lag";
const EVENTING_LAG_ALERT_METRIC = "operations.eventing.lag.alerts";

export interface GetPlatformSloSnapshotDeps {
	metrics: MetricsCollector;
	now?: () => string;
}

function roundPercent(value: number): number {
	return Math.round(value * 100) / 100;
}

function errorRatePercent(errors: number, total: number): number {
	if (total === 0) return 0;
	return roundPercent((errors / total) * 100);
}

function latencyPercentiles(values: number[]): {
	p50Ms: number;
	p95Ms: number;
	p99Ms: number;
} {
	if (values.length === 0) {
		return { p50Ms: 0, p95Ms: 0, p99Ms: 0 };
	}
	const sorted = [...values].sort((a, b) => a - b);
	return {
		p50Ms: percentile(sorted, 50),
		p95Ms: percentile(sorted, 95),
		p99Ms: percentile(sorted, 99),
	};
}

function buildApiRoutes(
	snapshot: ReturnType<MetricsCollector["getSnapshot"]>,
): PlatformSloRouteLatency[] {
	const requestsByPrefix = new Map<string, number>();
	const errorsByPrefix = new Map<string, number>();
	const latencyByPrefix = new Map<string, number[]>();

	for (const [rawKey, count] of Object.entries(snapshot.counters)) {
		const parsed = parseMetricKey(rawKey);
		const prefix = parsed.tags.prefix;
		if (!prefix) continue;
		if (parsed.name === API_REQUESTS_METRIC) {
			requestsByPrefix.set(prefix, count);
		} else if (parsed.name === API_ERRORS_METRIC) {
			errorsByPrefix.set(prefix, count);
		}
	}

	for (const [rawKey, values] of Object.entries(snapshot.histograms)) {
		const parsed = parseMetricKey(rawKey);
		const prefix = parsed.tags.prefix;
		if (!prefix || parsed.name !== API_LATENCY_METRIC) continue;
		latencyByPrefix.set(prefix, values);
	}

	const prefixes = new Set([
		...requestsByPrefix.keys(),
		...errorsByPrefix.keys(),
		...latencyByPrefix.keys(),
	]);

	return [...prefixes].sort().map((prefix) => {
		const requestCount = requestsByPrefix.get(prefix) ?? 0;
		const errorCount = errorsByPrefix.get(prefix) ?? 0;
		const latencies = latencyPercentiles(latencyByPrefix.get(prefix) ?? []);
		return {
			prefix,
			requestCount,
			errorCount,
			errorRatePercent: errorRatePercent(errorCount, requestCount),
			...latencies,
		};
	});
}

function eventingChannelKey(tags: Record<string, string>): string {
	const parts = [tags.channel ?? "unknown"];
	if (tags.owner_domain) parts.push(tags.owner_domain);
	if (tags.consumer) parts.push(tags.consumer);
	return parts.join("/");
}

function buildEventingChannels(
	snapshot: ReturnType<MetricsCollector["getSnapshot"]>,
): PlatformSloEventingLag[] {
	const lagByChannel = new Map<string, number[]>();
	const alertsByChannel = new Map<string, number>();

	for (const [rawKey, values] of Object.entries(snapshot.histograms)) {
		const parsed = parseMetricKey(rawKey);
		if (parsed.name !== EVENTING_LAG_METRIC) continue;
		const channelKey = eventingChannelKey(parsed.tags);
		lagByChannel.set(channelKey, values);
	}

	for (const [rawKey, count] of Object.entries(snapshot.counters)) {
		const parsed = parseMetricKey(rawKey);
		if (parsed.name !== EVENTING_LAG_ALERT_METRIC) continue;
		const channelKey = eventingChannelKey(parsed.tags);
		alertsByChannel.set(
			channelKey,
			(alertsByChannel.get(channelKey) ?? 0) + count,
		);
	}

	const channelKeys = new Set([
		...lagByChannel.keys(),
		...alertsByChannel.keys(),
	]);

	return [...channelKeys].sort().map((channelKey) => {
		const [channel, ownerDomain, consumer] = channelKey.split("/");
		const latencies = latencyPercentiles(lagByChannel.get(channelKey) ?? []);
		const sampleCount = lagByChannel.get(channelKey)?.length ?? 0;
		return {
			channel,
			ownerDomain: ownerDomain || undefined,
			consumer: consumer || undefined,
			sampleCount,
			alertCount: alertsByChannel.get(channelKey) ?? 0,
			...latencies,
		};
	});
}

function sumCounterMetric(
	snapshot: ReturnType<MetricsCollector["getSnapshot"]>,
	metricName: string,
): number {
	let total = 0;
	for (const [rawKey, count] of Object.entries(snapshot.counters)) {
		const parsed = parseMetricKey(rawKey);
		if (parsed.name === metricName) total += count;
	}
	return total;
}

/** Builds a redacted platform SLO/capacity snapshot from in-process metrics (ANX-170 S4). */
export function getPlatformSloSnapshot(
	deps: GetPlatformSloSnapshotDeps,
): PlatformSloSnapshot {
	const snapshot = deps.metrics.getSnapshot();
	const totalRequests = sumCounterMetric(snapshot, API_REQUESTS_METRIC);
	const totalErrors = sumCounterMetric(snapshot, API_ERRORS_METRIC);

	const body = {
		schemaVersion: PLATFORM_SLO_SNAPSHOT_SCHEMA_VERSION,
		generatedAt: deps.now?.() ?? new Date().toISOString(),
		scope: "platform" as const,
		api: {
			totalRequests,
			totalErrors,
			errorRatePercent: errorRatePercent(totalErrors, totalRequests),
			routes: buildApiRoutes(snapshot),
		},
		eventing: {
			channels: buildEventingChannels(snapshot),
		},
		capacity: {
			signalsAvailable: false,
			signals: [],
			note: "Pool, queue and storage utilization require platform control-plane metrics; not wired in this slice.",
		},
		cost: {
			signalsAvailable: false,
			signals: [],
			note: "Provider cost metrics require connections billing bridge; not wired in this slice.",
		},
	};

	return platformSloSnapshotSchema.parse(body);
}
