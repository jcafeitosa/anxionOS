import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Run } from "../../domain/entities/run";
import type { Task } from "../../domain/entities/task";
import type { ExpiredActiveLease } from "../../domain/ports/task-lease-repository";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import { sweepExpiredLeases } from "./sweep-expired-leases";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function createDeps(run: Run, task: Task, lease: ExpiredActiveLease) {
	let savedRun: Run | null = null;
	const ctx: OrchestrationTransactionContext = {
		client: null,
		goalRepository: {} as OrchestrationTransactionContext["goalRepository"],
		taskRepository: {
			async findByIdForUpdate(_org, id) {
				return id === task.id ? task : null;
			},
			async save(next) {
				return next;
			},
		} as OrchestrationTransactionContext["taskRepository"],
		runRepository: {
			async findById(_org, id) {
				return id === run.id ? run : null;
			},
			async save(next) {
				savedRun = next;
				return next;
			},
		} as OrchestrationTransactionContext["runRepository"],
		taskLeaseRepository: {
			async findExpiredActive() {
				return [lease];
			},
			async findActiveByTaskId() {
				return null;
			},
			async findByTaskIdAndToken() {
				return null;
			},
			async save(next) {
				return next;
			},
		} as OrchestrationTransactionContext["taskLeaseRepository"],
		gateBindingRepository: {} as OrchestrationTransactionContext["gateBindingRepository"],
		commandJournal: {} as OrchestrationTransactionContext["commandJournal"],
		runHeartbeatRepository: {} as OrchestrationTransactionContext["runHeartbeatRepository"],
		taskboardMirrorRepository: {} as OrchestrationTransactionContext["taskboardMirrorRepository"],
		async publishEvents() {},
	};
	const unitOfWork: OrchestrationUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		deps: {
			unitOfWork,
			leaseClock: {
				now: () => NOW,
				expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs),
			},
			randomInt: () => 0,
		},
		getSavedRun: () => savedRun,
	};
}

describe("sweepExpiredLeases", () => {
	test("skips WAITING_HUMAN_INPUT runs", async () => {
		const taskId = randomUUID();
		const runId = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: randomUUID(),
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-140",
			parentRunId: null,
			status: "WAITING_HUMAN_INPUT",
			coalesceKey: "coalesce-1",
			revision: 2,
			startedAt: NOW,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
			waitingHuman: {
				operationId: "op-approve",
				idempotencyKey: "idem-1",
				requestedAt: NOW.toISOString(),
			},
		};
		const task: Task = {
			id: taskId,
			organizationId: ORG,
			goalId: randomUUID(),
			goalAncestry: [randomUUID()],
			parentTaskId: null,
			issueIdentifier: "ANX-140",
			title: "task",
			checkoutStatus: "LEASED",
			revision: 1,
			createdAt: NOW,
			updatedAt: NOW,
		};
		const lease: ExpiredActiveLease = {
			id: randomUUID(),
			organizationId: ORG,
			taskId,
			runId,
			agentId: run.agentId,
			leaseToken: randomUUID(),
			leasedAt: new Date("2026-09-09T10:00:00.000Z"),
			expiresAt: new Date("2026-09-09T12:00:00.000Z"),
			heartbeatDueAt: null,
			releasedAt: null,
			createdAt: NOW,
		};
		const { deps, getSavedRun } = createDeps(run, task, lease);
		const result = await sweepExpiredLeases(deps, { batchSize: 10 });
		expect(result.processedCount).toBe(1);
		expect(result.orphanEventCount).toBe(0);
		expect(getSavedRun()).toBeNull();
	});
});
