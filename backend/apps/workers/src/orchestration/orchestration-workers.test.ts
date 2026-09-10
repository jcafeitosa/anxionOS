import {
	afterEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test";

const sweepExpiredLeases = mock(async () => ({
	processedCount: 0,
	orphanEventCount: 0,
	nextBatchDelayMs: 0,
}));

const dequeueRunHeartbeats = mock(async () => ({
	heartbeats: [],
	budgetStoppedRunIds: [],
}));

const acknowledgeRunHeartbeat = mock(async (deps: unknown, input: { heartbeatId: string }) => ({
	heartbeatId: input.heartbeatId,
	processedAt: new Date().toISOString(),
}));

mock.module("@anxionos/orchestration", () => ({
	sweepExpiredLeases,
	dequeueRunHeartbeats,
	acknowledgeRunHeartbeat,
	LEASE_SWEEPER_BATCH_SIZE: 100,
}));

const { startOrchestrationLeaseSweeper } = await import("./lease-sweeper");
const { startOrchestrationHeartbeatDequeue } = await import("./heartbeat-dequeue");
const { loadOrchestrationS5WorkerConfig, WORKER_PROFILE_ORCHESTRATION_S5 } =
	await import("../config");

describe("orchestration S5 workers", () => {
	afterEach(() => {
		sweepExpiredLeases.mockClear();
		dequeueRunHeartbeats.mockClear();
		acknowledgeRunHeartbeat.mockClear();
	});

	test("loadOrchestrationS5WorkerConfig reads orchestration-s5 profile", () => {
		process.env.WORKER_PROFILE = WORKER_PROFILE_ORCHESTRATION_S5;
		process.env.DATABASE_URL = "postgres://anxionos:anxionos@localhost:5432/anxionos";
		delete process.env.ORCHESTRATION_LEASE_SWEEPER_POLL_INTERVAL_MS;
		delete process.env.ORCHESTRATION_HEARTBEAT_DEQUEUE_POLL_INTERVAL_MS;

		const config = loadOrchestrationS5WorkerConfig();
		expect(config.profile).toBe(WORKER_PROFILE_ORCHESTRATION_S5);
		expect(config.leaseSweeperPollIntervalMs).toBe(30_000);
		expect(config.heartbeatDequeuePollIntervalMs).toBe(120_000);
	});

	test("lease sweeper worker invokes sweepExpiredLeases on bootstrap loop", async () => {
		const abortController = new AbortController();
		const worker = startOrchestrationLeaseSweeper({
			deps: {
				unitOfWork: { runInTransaction: async (work) => work({} as never) },
				leaseClock: {
					now: () => new Date(),
					expiresIn: (ttlMs: number) => new Date(Date.now() + ttlMs),
				},
			},
			config: { pollIntervalMs: 5, batchSize: 100 },
			signal: abortController.signal,
		});

		await new Promise((resolve) => setTimeout(resolve, 20));
		abortController.abort();
		await worker.stop();

		expect(sweepExpiredLeases.mock.calls.length).toBeGreaterThan(0);
	});

	test("heartbeat dequeue worker invokes dequeueRunHeartbeats on bootstrap loop", async () => {
		const abortController = new AbortController();
		const worker = startOrchestrationHeartbeatDequeue({
			deps: {
				unitOfWork: { runInTransaction: async (work) => work({} as never) },
				leaseClock: {
					now: () => new Date(),
					expiresIn: (ttlMs: number) => new Date(Date.now() + ttlMs),
				},
				operationalBudget: {
					reserveWakeupUnit: async () => true,
					remainingWakeupUnits: async () => 1,
				},
			},
			config: { pollIntervalMs: 5, batchLimit: 50 },
			signal: abortController.signal,
		});

		await new Promise((resolve) => setTimeout(resolve, 20));
		abortController.abort();
		await worker.stop();

		expect(dequeueRunHeartbeats.mock.calls.length).toBeGreaterThan(0);
	});
});
