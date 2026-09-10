import { describe, expect, test } from "bun:test";
import { OPERATIONS_EVENT_TYPES } from "@anxionos/contracts/operations";
import {
	OperationsCommandError,
	registerHealthCheck,
} from "@anxionos/operations";
import {
	createInMemoryCommandJournalRepository,
	createInMemoryHealthCheckRepository,
	createRecordingOperationsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const serviceId = "api-gateway";

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const healthChecks = createInMemoryHealthCheckRepository();
	const { unitOfWork, published } = createRecordingOperationsUnitOfWork({
		commandJournal,
		healthChecks,
	});
	return {
		deps: { unitOfWork, commandJournal },
		healthChecks,
		published,
	};
}

describe("registerHealthCheck (ANX-310 S1)", () => {
	test("creates health check and emits degraded event", async () => {
		const { deps, published } = createDeps();
		const result = await registerHealthCheck(deps, {
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			organizationId,
			serviceId,
			status: "DEGRADED",
			checkedAt: "2026-09-10T12:00:00.000Z",
			probeDetails: { origin: "probe", outcome: "timeout", durationMs: 21 },
		});
		expect(result.revision).toBe(1);
		expect(result.idempotentReplay).toBeUndefined();
		expect(published[0]?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED,
		);
	});

	test("replays idempotently for the same commandId", async () => {
		const { deps } = createDeps();
		const commandId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const first = await registerHealthCheck(deps, {
			commandId,
			organizationId,
			serviceId,
			status: "HEALTHY",
			checkedAt: "2026-09-10T12:00:00.000Z",
		});
		const second = await registerHealthCheck(deps, {
			commandId,
			organizationId,
			serviceId,
			status: "HEALTHY",
			checkedAt: "2026-09-10T12:00:00.000Z",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("updates existing service without idempotentReplay on new commandId", async () => {
		const { deps } = createDeps();
		const first = await registerHealthCheck(deps, {
			commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
			organizationId,
			serviceId,
			status: "HEALTHY",
			checkedAt: "2026-09-10T12:00:00.000Z",
		});
		const second = await registerHealthCheck(deps, {
			commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
			organizationId,
			serviceId,
			status: "UNHEALTHY",
			checkedAt: "2026-09-10T12:00:01.000Z",
		});
		expect(second.idempotentReplay).toBeUndefined();
		expect(second.revision).toBe(first.revision + 1);
		expect(second.aggregateId).toBe(first.aggregateId);
	});

	test("rejects stale checkedAt updates", async () => {
		const { deps } = createDeps();
		await registerHealthCheck(deps, {
			commandId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
			organizationId,
			serviceId,
			status: "HEALTHY",
			checkedAt: "2026-09-10T12:00:01.000Z",
		});
		await expect(
			registerHealthCheck(deps, {
				commandId: "11111111-1111-4111-8111-111111111111",
				organizationId,
				serviceId,
				status: "HEALTHY",
				checkedAt: "2026-09-10T12:00:00.000Z",
			}),
		).rejects.toMatchObject({
			code: "OPS_STALE_CHECKED_AT",
		} satisfies Partial<OperationsCommandError>);
	});
});
