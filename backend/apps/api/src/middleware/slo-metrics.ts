import {
	createMetricsCollector,
	type MetricsCollector,
} from "@anxionos/observability";
import type { Elysia } from "elysia";

const API_REQUESTS_METRIC = "api.requests";
const API_ERRORS_METRIC = "api.errors";
const API_LATENCY_METRIC = "api.latency";

let apiMetricsCollector: MetricsCollector | undefined;

/** Shared in-process collector for API SLO instrumentation (ANX-170 S1). */
export function getApiMetricsCollector(): MetricsCollector {
	if (!apiMetricsCollector) {
		apiMetricsCollector = createMetricsCollector();
	}
	return apiMetricsCollector;
}

/** Collapse dynamic path segments to a stable route prefix for SLO grouping. */
export function resolveRoutePrefix(pathname: string): string {
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length === 0) return "/";
	if (segments.length === 1) return `/${segments[0]}`;
	return `/${segments[0]}/${segments[1]}`;
}

function resolveResponseStatus(set: { status?: number | string }): number {
	const raw = set.status;
	if (typeof raw === "number") return raw;
	if (typeof raw === "string") {
		const parsed = Number.parseInt(raw, 10);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return 200;
}

function recordRequestMetrics(
	metrics: MetricsCollector,
	pathname: string,
	statusCode: number,
	startedAtMs?: number,
): void {
	const prefix = resolveRoutePrefix(pathname);
	const tags = { prefix };
	metrics.incrementCounter(API_REQUESTS_METRIC, tags);
	if (statusCode >= 400) {
		metrics.incrementCounter(API_ERRORS_METRIC, tags);
	}
	if (startedAtMs !== undefined) {
		const latencyMs = Math.max(0, performance.now() - startedAtMs);
		metrics.recordHistogram(API_LATENCY_METRIC, latencyMs, tags);
	}
}

export interface SloMetricsPluginDeps {
	metrics: MetricsCollector;
}

/** Elysia plugin — request latency histogram + error counter per route prefix. */
export function createSloMetricsPlugin(deps: SloMetricsPluginDeps) {
	return (app: Elysia) =>
		app
			.onRequest(({ store }) => {
				store.sloRequestStartMs = performance.now();
				store.sloMetricsRecorded = false;
			})
			.onAfterHandle(({ request, set, store }) => {
				if (store.sloMetricsRecorded) return;
				store.sloMetricsRecorded = true;
				const pathname = new URL(request.url).pathname;
				recordRequestMetrics(
					deps.metrics,
					pathname,
					resolveResponseStatus(set),
					store.sloRequestStartMs as number | undefined,
				);
			})
			.onError(({ request, set, store }) => {
				if (store.sloMetricsRecorded) return;
				store.sloMetricsRecorded = true;
				const pathname = new URL(request.url).pathname;
				recordRequestMetrics(
					deps.metrics,
					pathname,
					resolveResponseStatus(set),
					store.sloRequestStartMs as number | undefined,
				);
			});
}
