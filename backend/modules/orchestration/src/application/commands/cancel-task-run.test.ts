import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Run } from "../../domain/entities/run";
import type { TaskWithLease } from "../../domain/entities/task";
import type { TaskLease } from "../../domain/entities/task-lease";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import { cancelTaskRun } from "./cancel-task-run";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function createHarness(run: Run, task: TaskWithLease, lease: TaskLease | null) {
	const events: unknown[] = [];
	let cancelledHeartbeats = 0;
	const commandJournal = new Map<string, Record<string, unknown>>();
	const ctx: OrchestrationTransactionContext = {
		client: null,
		goalRepository: {} as OrchestrationTransactionContext["goalRepository"],
		taskRepository: {
			async findByIdForUpdate(_org, id) {
				return id === task.id ? task : null;
			},
			async save(next) {
				Object.assign(task, next);
				return next;
			},
		} as OrchestrationTransactionContext["taskRepository"],
		runRepository: {
			async findById(_org, id) {
				return id === run.id ? run : null;
			},
			async save(next) {
				Object.assign(run, next);
				return next;
			},
		} as OrchestrationTransactionContext["runRepository"],
		taskLeaseRepository: {
			async save(next) {
				task.lease = next;
				return next;
			},
		} as OrchestrationTransactionContext["taskLeaseRepository"],
		gateBindingRepository: {} as OrchestrationTransactionContext["gateBindingRepository"],
		commandJournal: {
			async findByCommandId(id) {
				const row = commandJournal.get(id);
				return row
					? {
							commandId: id,
							commandName: "CancelTaskRun",
							aggregateId: run.id,
							aggregateType: "Run",
							revision: run.revision,
							responseSnapshot: row,
							createdAt: NOW,
						}
					: null;
			},
			async record(entry) {
				commandJournal.set(entry.commandId, entry.responseSnapshot ?? {});
				return { ...entry, createdAt: NOW };
			},
		} as OrchestrationTransactionContext["commandJournal"],
		runHeartbeatRepository: {
			async save(heartbeat) {
				return heartbeat;
			},
			async findById() {
				return null;
			},
			async findPendingByCoalesceKey() {
				return null;
			},
			async countPendingByOrganization() {
				return 0;
			},
			async findDuePending() {
				return [];
			},
			async cancelPendingForRun() {
				cancelledHeartbeats += 1;
				return 1;
			},
		} as OrchestrationTransactionContext["runHeartbeatRepository"],
		taskboardMirrorRepository: {} as OrchestrationTransactionContext["taskboardMirrorRepository"],
		async publishEvents(envelopes) {
			events.push(...envelopes);
		},
	};
	const unitOfWork: OrchestrationUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		deps: {
			unitOfWork,
			commandJournal: ctx.commandJournal,
			leaseClock: { now: () => NOW, expiresIn: (ms: number) => new Date(NOW.getTime() + ms) },
		},
		events,
		getRun: () => run,
		getCancelledHeartbeats: () => cancelledHeartbeats,
	};
}

describe("cancelTaskRun", () => {
	test("terminates active run, releases lease and cancels heartbeats", async () => {
		const taskId = randomUUID();
		const runId = randomUUID();
		const leaseToken = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: "agent-1",
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-307",
			parentRunId: null,
			status: "ACTIVE",
			coalesceKey: "ck",
			revision: 2,
			startedAt: NOW,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
			waitingHuman: null,
		};
		const lease: TaskLease = {
			id: randomUUID(),
			taskId,
			runId,
			agentId: "agent-1",
			leaseToken,
			leasedAt: NOW,
			expiresAt: new Date(NOW.getTime() + 60_000),
			heartbeatDueAt: null,
			releasedAt: null,
			createdAt: NOW,
		};
		const task: TaskWithLease = {
			id: taskId,
			organizationId: ORG,
			goalId: run.goalAncestry[0]!,
			goalAncestry: run.goalAncestry,
			parentTaskId: null,
			issueIdentifier: "ANX-307",
			title: "cancel test",
			checkoutStatus: "LEASED",
			revision: 1,
			createdAt: NOW,
			updatedAt: NOW,
			lease,
		};
		const harness = createHarness(run, task, lease);
		const result = await cancelTaskRun(harness.deps, {
			organizationId: ORG,
			taskId,
			runId,
			agentId: "agent-1",
			runRevision: 2,
			idempotencyKey: "cancel-1",
			leaseToken,
		});
		expect(result.status).toBe("TERMINATED");
		expect(result.runRevision).toBe(3);
		expect(harness.getRun().status).toBe("TERMINATED");
		expect(task.checkoutStatus).toBe("UNCLAIMED");
		expect(task.lease?.releasedAt).toEqual(NOW);
		expect(harness.getCancelledHeartbeats()).toBe(1);
		expect(harness.events.length).toBeGreaterThanOrEqual(2);
	});

	test("rejects fencing mismatch", async () => {
		const taskId = randomUUID();
		const runId = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: "agent-1",
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-307",
			parentRunId: null,
			status: "ACTIVE",
			coalesceKey: "ck",
			revision: 5,
			startedAt: NOW,
			completedAt: null,
			createdAt: NOW,
			updatedAt: NOW,
			waitingHuman: null,
		};
		const task: TaskWithLease = {
			id: taskId,
			organizationId: ORG,
			goalId: run.goalAncestry[0]!,
			goalAncestry: run.goalAncestry,
			parentTaskId: null,
			issueIdentifier: "ANX-307",
			title: "cancel test",
			checkoutStatus: "LEASED",
			revision: 1,
			createdAt: NOW,
			updatedAt: NOW,
			lease: null,
		};
		const harness = createHarness(run, task, null);
		await expect(
			cancelTaskRun(harness.deps, {
				organizationId: ORG,
				taskId,
				runId,
				agentId: "agent-1",
				runRevision: 2,
				idempotencyKey: "cancel-2",
			}),
		).rejects.toMatchObject({ orchestrationCode: "ORC_RUN_FENCING_MISMATCH" });
	});

	test("idempotent replay does not duplicate termination", async () => {
		const taskId = randomUUID();
		const runId = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: "agent-1",
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-307",
			parentRunId: null,
			status: "TERMINATED",
			coalesceKey: "ck",
			revision: 3,
			startedAt: NOW,
			completedAt: NOW,
			createdAt: NOW,
			updatedAt: NOW,
			waitingHuman: null,
		};
		const task: TaskWithLease = {
			id: taskId,
			organizationId: ORG,
			goalId: run.goalAncestry[0]!,
			goalAncestry: run.goalAncestry,
			parentTaskId: null,
			issueIdentifier: "ANX-307",
			title: "cancel test",
			checkoutStatus: "UNCLAIMED",
			revision: 2,
			createdAt: NOW,
			updatedAt: NOW,
			lease: null,
		};
		const harness = createHarness(run, task, null);
		const result = await cancelTaskRun(harness.deps, {
			organizationId: ORG,
			taskId,
			runId,
			agentId: "agent-1",
			runRevision: 99,
			idempotencyKey: "cancel-3",
		});
		expect(result.idempotentReplay).toBe(true);
		expect(harness.events).toHaveLength(0);
	});
});
