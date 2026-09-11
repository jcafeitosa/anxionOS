import { createLogger } from "@anxionos/observability";
import {
	acknowledgeRunHeartbeat,
	dequeueRunHeartbeats,
	type LeaseClock,
	type OperationalBudgetPort,
	type OrchestrationUnitOfWork,
} from "@anxionos/orchestration";
import { sleepWithAbort } from "./poll-utils";

export const ORCHESTRATION_HEARTBEAT_DEQUEUE_WORKER_NAME =
	"apps/workers:orchestration-heartbeat-dequeue:v1";

const logger = createLogger({ service: "orchestration-heartbeat-dequeue" });

export interface HeartbeatDequeueWorkerConfig {
	pollIntervalMs: number;
	batchLimit: number;
}

export interface HeartbeatDequeueWorkerDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
	operationalBudget: OperationalBudgetPort;
}

export interface HeartbeatDequeueWorkerHandle {
	stop(): Promise<void>;
}

export function startOrchestrationHeartbeatDequeue(input: {
	deps: HeartbeatDequeueWorkerDeps;
	config: HeartbeatDequeueWorkerConfig;
	signal?: AbortSignal;
}): HeartbeatDequeueWorkerHandle {
	let stopRequested = false;
	let stopPromise: Promise<void> | undefined;

	const runLoop = async () => {
		while (!stopRequested && !input.signal?.aborted) {
			try {
				const result = await dequeueRunHeartbeats(input.deps, {
					limit: input.config.batchLimit,
				});
				for (const heartbeat of result.heartbeats) {
					await acknowledgeRunHeartbeat(input.deps, {
						heartbeatId: heartbeat.id,
					});
				}
				if (
					result.heartbeats.length > 0 ||
					result.budgetStoppedRunIds.length > 0
				) {
					logger.info("Heartbeat dequeue batch complete", {
						worker: ORCHESTRATION_HEARTBEAT_DEQUEUE_WORKER_NAME,
						claimed: result.heartbeats.length,
						budgetStoppedRunIds: result.budgetStoppedRunIds,
					});
				}
			} catch (error) {
				logger.error("Heartbeat dequeue batch failed", {
					worker: ORCHESTRATION_HEARTBEAT_DEQUEUE_WORKER_NAME,
					error: error instanceof Error ? error.message : String(error),
				});
			}
			await sleepWithAbort(input.config.pollIntervalMs, input.signal);
		}
	};

	const loopPromise = runLoop();

	return {
		stop: async () => {
			if (stopPromise) {
				return stopPromise;
			}
			stopPromise = (async () => {
				stopRequested = true;
				await loopPromise;
			})();
			return stopPromise;
		},
	};
}
