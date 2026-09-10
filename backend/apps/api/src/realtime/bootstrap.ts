import type { Pool } from "pg";
import { createLogger } from "@anxionos/observability";
import { bootstrapRealtimeNatsBridge } from "./nats-bridge";
import { SubscriptionManager } from "./subscription-manager";
import { startRealtimeTimers, type RealtimeTimersHandle } from "./timers";

const logger = createLogger({ service: "realtime-bootstrap" });

export interface RealtimeRuntime {
	manager: SubscriptionManager;
	stop: () => Promise<void>;
}

export function createRealtimeRuntime(pool?: Pool): RealtimeRuntime {
	const manager = new SubscriptionManager();
	const timers: RealtimeTimersHandle = startRealtimeTimers(manager, pool);
	bootstrapRealtimeNatsBridge(manager);
	logger.info("Realtime runtime started");
	return {
		manager,
		stop: async () => {
			timers.stop();
		},
	};
}
