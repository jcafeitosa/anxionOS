import type { EventingLagChannel } from "../ports/eventing-lag-query";

/** P08 / graph inbox ack lag guidance — warn 30s, critical 60s. */
export const DEFAULT_EVENTING_LAG_THRESHOLDS = {
	warnLagMs: 30_000,
	criticalLagMs: 60_000,
} as const;

export type EventingLagSliThresholds = {
	warnLagMs: number;
	criticalLagMs: number;
};

export type EventingLagSliStatus = "ok" | "warn" | "critical";

export type LagAlertSeverity = "warn" | "critical";

export interface EventingLagAlert {
	channel: EventingLagChannel;
	lagMs: number;
	severity: LagAlertSeverity;
	pendingCount: number;
	ownerDomain?: string;
	consumerName?: string;
}

export function computeLagMs(oldestPendingAt: string, nowIso: string): number {
	const lagMs = Date.parse(nowIso) - Date.parse(oldestPendingAt);
	return Number.isFinite(lagMs) ? Math.max(0, lagMs) : 0;
}

export function evaluateEventingLagSli(
	lagMs: number,
	thresholds: EventingLagSliThresholds,
): EventingLagSliStatus {
	if (lagMs >= thresholds.criticalLagMs) return "critical";
	if (lagMs >= thresholds.warnLagMs) return "warn";
	return "ok";
}

export function lagStatusToAlertSeverity(
	status: EventingLagSliStatus,
): LagAlertSeverity | null {
	if (status === "ok") return null;
	return status;
}
