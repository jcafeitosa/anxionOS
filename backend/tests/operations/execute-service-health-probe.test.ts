import { describe, expect, test } from "bun:test";
import { OPERATIONS_EVENT_TYPES } from "@anxionos/contracts/operations";
import {
	executeServiceHealthProbe,
	getServiceHealth,
} from "@anxionos/operations";
import {
	createInMemoryCommandJournalRepository,
	createInMemoryHealthCheckRepository,
	createRecordingOperationsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const serviceId = "worker-scheduler";

function createDeps(runProbe: () => Promise<void>) {
	const commandJournal = createInMemoryCommandJournalRepository();
	const healthChecks = createInMemoryHealthCheckRepository();
	const { unitOfWork, published } = createRecordingOperationsUnitOfWork({
		commandJournal,
		healthChecks,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			runProbe,
			now: () => "2026-09-10T12:00:00.000Z",
		},
		healthChecks,
		published,
	};
}

describe("executeServiceHealthProbe (ANX-310 S1 oracle)", () => {
	test("executes probe and registers HEALTHY snapshot with probe origin", async () => {
		const { deps, healthChecks } = createDeps(async () => undefined);
		const result = await executeServiceHealthProbe(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			serviceId,
		});
		expect(result.revision).toBe(1);
		const snapshot = await getServiceHealth(
			{ healthChecks, now: () => "2026-09-10T12:00:00.000Z" },
			organizationId,
			serviceId,
		);
		expect(snapshot.status).toBe("HEALTHY");
		expect(snapshot.probeDetails).toMatchObject({
			origin: "probe",
			outcome: "ok",
		});
		expect(snapshot.isStale).toBe(false);
	});

	test("probe error registers UNHEALTHY and emits degraded event", async () => {
		const { deps, published } = createDeps(async () => {
			throw new Error("postgres unavailable");
		});
		const result = await executeServiceHealthProbe(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			organizationId,
			serviceId,
		});
		expect(result.revision).toBe(1);
		expect(published[0]?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED,
		);
	});

	test("probe timeout registers DEGRADED with timedOut observable", async () => {
		const { deps, healthChecks } = createDeps(
			() => new Promise<void>(() => {}),
		);
		await executeServiceHealthProbe(
			{ ...deps, probeTimeoutMs: 20 },
			{
				commandId: "55555555-5555-4555-8555-555555555555",
				organizationId,
				serviceId: "slow-service",
			},
		);
		const snapshot = await getServiceHealth(
			{ healthChecks },
			organizationId,
			"slow-service",
		);
		expect(snapshot.status).toBe("DEGRADED");
		expect(snapshot.probeDetails).toMatchObject({
			origin: "probe",
			outcome: "timeout",
			timedOut: true,
		});
	});

	test("getServiceHealth marks stale snapshots", async () => {
		const healthChecks = createInMemoryHealthCheckRepository([
			{
				id: "ops_hlt_44444444-4444-4444-8444-444444444444",
				organizationId,
				serviceId,
				status: "HEALTHY",
				probeDetails: {
					origin: "probe",
					outcome: "ok",
					durationMs: 3,
				},
				checkedAt: "2026-09-10T12:00:00.000Z",
				revision: 1,
			},
		]);
		const snapshot = await getServiceHealth(
			{
				healthChecks,
				now: () => "2026-09-10T12:05:00.000Z",
				staleThresholdMs: 60_000,
			},
			organizationId,
			serviceId,
		);
		expect(snapshot.isStale).toBe(true);
		expect(snapshot.probeDetails).toMatchObject({ origin: "probe" });
	});
});
