// observability — SLO metrics + structured logging for anxiousOS P08
// See brain/system-capabilities/p08-operations-slos-recovery-contract.md

type LogLevel = "debug" | "info" | "warn" | "error";

export type { LogLevel };

export interface Logger {
	debug(message: string, meta?: Record<string, unknown>): void;
	info(message: string, meta?: Record<string, unknown>): void;
	warn(message: string, meta?: Record<string, unknown>): void;
	error(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerOptions {
	service: string;
	level?: LogLevel;
}

const LEVEL_ORDER: LogLevel[] = ["debug", "info", "warn", "error"];

function shouldLog(current: LogLevel, messageLevel: LogLevel): boolean {
	return LEVEL_ORDER.indexOf(messageLevel) >= LEVEL_ORDER.indexOf(current);
}

/** ANX-170 — Metrics counter for SLO tracking (in-memory, per-service). */
export interface MetricsCollector {
	incrementCounter(name: string, tags?: Record<string, string>): void;
	recordHistogram(
		name: string,
		valueMs: number,
		tags?: Record<string, string>,
	): void;
	getSnapshot(): {
		counters: Record<string, number>;
		histograms: Record<string, number[]>;
	};
}

export function createMetricsCollector(): MetricsCollector {
	const counters = new Map<string, number>();
	const histograms = new Map<string, number[]>();
	return {
		incrementCounter(name, tags) {
			const key = tags
				? name +
					":" +
					Object.entries(tags)
						.map(([k, v]) => k + "=" + v)
						.join(",")
				: name;
			counters.set(key, (counters.get(key) ?? 0) + 1);
		},
		recordHistogram(name, valueMs, tags) {
			const key = tags
				? name +
					":" +
					Object.entries(tags)
						.map(([k, v]) => k + "=" + v)
						.join(",")
				: name;
			const arr = histograms.get(key) ?? [];
			arr.push(valueMs);
			histograms.set(key, arr);
		},
		getSnapshot() {
			const countersObj: Record<string, number> = {};
			for (const [k, v] of counters) countersObj[k] = v;
			const histogramsObj: Record<string, number[]> = {};
			for (const [k, v] of histograms) histogramsObj[k] = v;
			return { counters: countersObj, histograms: histogramsObj };
		},
	};
}

/** ANX-170 — SLO definition for a given service + capability. */
export interface SLODefinition {
	service: string;
	capability: string;
	targetPercent: number;
	windowMinutes: number;
	budgetPercent: number;
	owner: string;
	onViolation: "alert" | "block" | "degrade";
}

export function createSLODefinition(
	service: string,
	capability: string,
	targetPercent: number,
	owner: string,
	onViolation: SLODefinition["onViolation"] = "alert",
): SLODefinition {
	return {
		service,
		capability,
		targetPercent,
		windowMinutes: 60,
		budgetPercent: Math.round((100 - targetPercent) * 100) / 100,
		owner,
		onViolation,
	};
}

/** ANX-170 — Check SLO against metrics snapshot; returns violation or null. */
export function checkSLOViolation(
	slo: SLODefinition,
	snapshot: MetricsCollector,
): {
	violation: boolean;
	errorBudgetRemainingPercent: number;
	details: string;
} {
	const errorKey = slo.service + ".errors:" + slo.capability;
	const totalKey = slo.service + ".requests:" + slo.capability;
	const errors = snapshot.getSnapshot().counters[errorKey] ?? 0;
	const total = snapshot.getSnapshot().counters[totalKey] ?? 0;
	if (total === 0)
		return {
			violation: false,
			errorBudgetRemainingPercent: 100,
			details: "no requests yet",
		};
	const errorRate = (errors / total) * 100;
	const budgetRemaining = slo.budgetPercent - errorRate;
	return {
		violation: errorRate > slo.budgetPercent,
		errorBudgetRemainingPercent: Math.round(budgetRemaining * 100) / 100,
		details:
			errorRate.toFixed(2) +
			"% errors (" +
			slo.budgetPercent +
			"% budget allowed)",
	};
}

/** ANX-170 — Latency percentile calculator for histogram. */
export function percentile(sortedMs: number[], p: number): number {
	if (sortedMs.length === 0) return 0;
	const idx = Math.max(
		0,
		Math.min(Math.ceil((p / 100) * sortedMs.length) - 1, sortedMs.length - 1),
	);
	return sortedMs[idx];
}

export function createLogger(options: LoggerOptions): Logger {
	const level = options.level ?? "info";
	const write = (
		messageLevel: LogLevel,
		message: string,
		meta?: Record<string, unknown>,
	) => {
		if (!shouldLog(level, messageLevel)) return;
		console.log(
			JSON.stringify({
				level: messageLevel,
				service: options.service,
				message,
				...meta,
				timestamp: new Date().toISOString(),
			}),
		);
	};
	return {
		debug: (message, meta) => write("debug", message, meta),
		info: (message, meta) => write("info", message, meta),
		warn: (message, meta) => write("warn", message, meta),
		error: (message, meta) => write("error", message, meta),
	};
}
