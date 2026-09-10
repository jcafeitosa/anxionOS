import type { Pool } from "pg";
import { probeHealthDeps } from "../health/probe-deps";
import type { SubscriptionManager } from "./subscription-manager";

const HEALTH_INTERVAL_MS = 5_000;
const METRICS_INTERVAL_MS = 10_000;

export interface RealtimeTimersHandle {
	stop: () => void;
}

export function startRealtimeTimers(
	manager: SubscriptionManager,
	pool?: Pool,
): RealtimeTimersHandle {
	const healthTimer = setInterval(() => {
		void probeHealthDeps(pool).then((deps) => {
			for (const snapshot of manager.listSubscriptions()) {
				manager.publish({
					type: "health.deps.snapshot",
					channel: "health.deps",
					tenantId: snapshot.tenantId,
					payload: deps,
				});
			}
		});
	}, HEALTH_INTERVAL_MS);

	const metricsTimer = setInterval(() => {
		for (const snapshot of manager.listSubscriptions()) {
			manager.publish({
				type: "dashboard.metrics.demo",
				channel: "dashboard.metrics",
				tenantId: snapshot.tenantId,
				stale: true,
				payload: {
					activeConnections: manager.listSubscriptions().length,
					demo: true,
				},
			});
		}
	}, METRICS_INTERVAL_MS);

	return {
		stop: () => {
			clearInterval(healthTimer);
			clearInterval(metricsTimer);
		},
	};
}
