import {
	LEASE_SWEEPER_BATCH_SIZE,
	sweepExpiredLeases,
	type LeaseClock,
	type OrchestrationUnitOfWork,
} from "@anxionos/orchestration";
import { createLogger } from "@anxionos/observability";
import { sleepWithAbort } from "./poll-utils";

export const ORCHESTRATION_LEASE_SWEEPER_WORKER_NAME =
	"apps/workers:orchestration-lease-sweeper:v1";

const logger = createLogger({ service: "orchestration-lease-sweeper" });

export interface LeaseSweeperWorkerConfig {
	pollIntervalMs: number;
	batchSize: number;
}

export interface LeaseSweeperWorkerDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
	randomInt?: (min: number, max: number) => number;
}

export interface LeaseSweeperWorkerHandle {
	stop(): Promise<void>;
}

export function startOrchestrationLeaseSweeper(input: {
	deps: LeaseSweeperWorkerDeps;
	config: LeaseSweeperWorkerConfig;
	signal?: AbortSignal;
}): LeaseSweeperWorkerHandle {
	let stopRequested = false;
	let stopPromise: Promise<void> | undefined;

	const runLoop = async () => {
		while (!stopRequested && !input.signal?.aborted) {
			let delayMs = input.config.pollIntervalMs;
			try {
				const result = await sweepExpiredLeases(input.deps, {
					batchSize: input.config.batchSize,
				});
				if (result.processedCount > 0) {
					logger.info("Lease sweeper batch complete", {
						worker: ORCHESTRATION_LEASE_SWEEPER_WORKER_NAME,
						processedCount: result.processedCount,
						orphanEventCount: result.orphanEventCount,
						nextBatchDelayMs: result.nextBatchDelayMs,
					});
				}
				if (result.nextBatchDelayMs > 0) {
					delayMs = result.nextBatchDelayMs;
				}
			} catch (error) {
				logger.error("Lease sweeper batch failed", {
					worker: ORCHESTRATION_LEASE_SWEEPER_WORKER_NAME,
					error: error instanceof Error ? error.message : String(error),
				});
			}
			await sleepWithAbort(delayMs, input.signal);
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

export const DEFAULT_LEASE_SWEEPER_BATCH_SIZE = LEASE_SWEEPER_BATCH_SIZE;
