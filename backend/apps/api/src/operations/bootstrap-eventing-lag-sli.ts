import type { MetricsCollector } from "@anxionos/observability";
import { createLogger } from "@anxionos/observability";
import {
	createPgEventingLagQueryAdapter,
	type EventingLagQueryPort,
	type LagAlertHook,
	recordEventingLagSli,
} from "@anxionos/operations";
import type { Pool } from "pg";

const logger = createLogger({ service: "eventing-lag-sli" });

const DEFAULT_INTERVAL_MS = 30_000;

function parseIntervalMs(): number {
	const raw = process.env.EVENTING_LAG_SLI_INTERVAL_MS?.trim();
	if (!raw) return DEFAULT_INTERVAL_MS;
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < 1_000) {
		logger.warn("EVENTING_LAG_SLI_INTERVAL_MS invalid — using default", {
			raw,
			defaultMs: DEFAULT_INTERVAL_MS,
		});
		return DEFAULT_INTERVAL_MS;
	}
	return parsed;
}

function createLoggingLagAlertHook(): LagAlertHook {
	return {
		onLagAlert(alert) {
			logger.warn("Eventing lag SLI threshold breached", { ...alert });
		},
	};
}

export interface EventingLagSliTickerDeps {
	lagQuery: EventingLagQueryPort;
	metrics: MetricsCollector;
	now?: () => string;
	intervalMs?: number;
	alertHooks?: LagAlertHook[];
}

export interface EventingLagSliTickerHandle {
	stop: () => void;
}

/** Runs one eventing lag SLI sample cycle (outbox + inbox ports). */
export async function runEventingLagSliTick(
	deps: EventingLagSliTickerDeps,
): Promise<void> {
	const result = await recordEventingLagSli({
		lagQuery: deps.lagQuery,
		metrics: deps.metrics,
		now: deps.now ?? (() => new Date().toISOString()),
		alertHooks: deps.alertHooks ?? [createLoggingLagAlertHook()],
	});
	if (result.alerts.length > 0) {
		logger.info("Eventing lag SLI tick completed with alerts", {
			alertCount: result.alerts.length,
			sampleCount: result.samples.length,
		});
	}
	// #region agent log
	fetch("http://127.0.0.1:7857/ingest/a6fc5ec4-791b-4921-8e35-5c7ce20619e6", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Debug-Session-Id": "4cc2f6",
		},
		body: JSON.stringify({
			sessionId: "4cc2f6",
			runId: "monitor",
			hypothesisId: "M2",
			location: "bootstrap-eventing-lag-sli.ts:runEventingLagSliTick",
			message: "eventing lag sli tick",
			data: {
				alertCount: result.alerts.length,
				sampleCount: result.samples.length,
				alerts: result.alerts,
			},
			timestamp: Date.now(),
		}),
	}).catch(() => {});
	// #endregion
}

export function createEventingLagSliTicker(
	deps: EventingLagSliTickerDeps,
): EventingLagSliTickerHandle {
	const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
	const timer = setInterval(() => {
		void runEventingLagSliTick(deps).catch((error: unknown) => {
			logger.error("Eventing lag SLI tick failed", {
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}, intervalMs);

	void runEventingLagSliTick(deps).catch((error: unknown) => {
		logger.error("Eventing lag SLI initial tick failed", {
			error: error instanceof Error ? error.message : String(error),
		});
	});

	return {
		stop: () => clearInterval(timer),
	};
}

export function startEventingLagSliTicker(
	pool: Pool,
	metrics: MetricsCollector,
): EventingLagSliTickerHandle {
	if (process.env.EVENTING_LAG_SLI_DISABLED === "true") {
		logger.info("Eventing lag SLI ticker disabled by env");
		return { stop: () => {} };
	}

	return createEventingLagSliTicker({
		lagQuery: createPgEventingLagQueryAdapter(pool),
		metrics,
		intervalMs: parseIntervalMs(),
	});
}

export function bootstrapEventingLagSli(
	pool: Pool,
	metrics: MetricsCollector,
): void {
	startEventingLagSliTicker(pool, metrics);
	logger.info("Eventing lag SLI ticker started", {
		intervalMs: parseIntervalMs(),
	});
}
