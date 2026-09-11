import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Run } from "../../domain/entities/run";
import type { TaskWithLease } from "../../domain/entities/task";
import type { TaskLease } from "../../domain/entities/task-lease";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import type { StopRunForBudgetDeps } from "./stop-run-for-budget";
import { stopRunForBudget } from "./stop-run-for-budget";

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
			async findByRunId(id) {
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
							commandName: "StopRunForBudget",
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
	return { unitOfWork, events, run, task, lease };
}

describe("stopRunForBudget", () => {
	test("transitions active run to BUDGET_STOPPED and cancels heartbeats", async () => {
		const runId = randomUUID();
		const taskId = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: "agent-1",
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-308",
			parentRunId: null,
			status: "ACTIVE",
			coalesceKey: "k",
			revision: 1,
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
			leaseToken: randomUUID(),
			leasedAt: NOW,
			expiresAt: new Date(NOW.getTime() + 60_000),
			heartbeatDueAt: null,
			releasedAt: null,
			createdAt: NOW,
		};
		const task: TaskWithLease = {
			id: taskId,
			organizationId: ORG,
			goalId: randomUUID(),
			goalAncestry: run.goalAncestry,
			parentTaskId: null,
			issueIdentifier: "ANX-308",
			title: "budget test",
			checkoutStatus: "LEASED",
			revision: 1,
			createdAt: NOW,
			updatedAt: NOW,
			lease,
		};
		const { unitOfWork, events } = createHarness(run, task, lease);
		const result = await stopRunForBudget(
			{
				unitOfWork,
				commandJournal: {
					async findByCommandId(id) {
						return (await unitOfWork.runInTransaction(async (ctx) =>
							ctx.commandJournal.findByCommandId(id),
						)) as never;
					},
					async record(entry) {
						return unitOfWork.runInTransaction(async (ctx) =>
							ctx.commandJournal.record(entry),
						);
					},
				},
				leaseClock: { now: () => NOW, expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs) },
			},
			{
				organizationId: ORG,
				taskId,
				runId,
				agentId: "agent-1",
				runRevision: 1,
				idempotencyKey: "budget-1",
			},
		);
		expect(result.status).toBe("BUDGET_STOPPED");
		expect(result.cancelledHeartbeats).toBe(1);
		expect(run.status).toBe("BUDGET_STOPPED");
		expect(events.some((e) => (e as { eventType?: string }).eventType === "orchestration.run.budget_stopped.v1")).toBe(true);
	});

	test("idempotent replay when already BUDGET_STOPPED", async () => {
		const runId = randomUUID();
		const taskId = randomUUID();
		const run: Run = {
			id: runId,
			taskId,
			agentId: "agent-1",
			organizationId: ORG,
			goalAncestry: [randomUUID()],
			issueIdentifier: "ANX-308",
			parentRunId: null,
			status: "BUDGET_STOPPED",
			coalesceKey: "k",
			revision: 2,
			startedAt: NOW,
			completedAt: NOW,
			createdAt: NOW,
			updatedAt: NOW,
			waitingHuman: null,
		};
		const task: TaskWithLease = {
			id: taskId,
			organizationId: ORG,
			goalId: randomUUID(),
			goalAncestry: run.goalAncestry,
			parentTaskId: null,
			issueIdentifier: "ANX-308",
			title: "budget test",
			checkoutStatus: "UNCLAIMED",
			revision: 2,
			createdAt: NOW,
			updatedAt: NOW,
			lease: null,
		};
		const { unitOfWork } = createHarness(run, task, null);
		const deps: StopRunForBudgetDeps = {
			unitOfWork,
			commandJournal: {
				async findByCommandId(id) {
					return (await unitOfWork.runInTransaction(async (ctx) =>
						ctx.commandJournal.findByCommandId(id),
					)) as never;
				},
				async record(entry) {
					return unitOfWork.runInTransaction(async (ctx) =>
						ctx.commandJournal.record(entry),
					);
				},
			},
			leaseClock: { now: () => NOW, expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs) },
		};
		const result = await stopRunForBudget(deps, {
			organizationId: ORG,
			taskId,
			runId,
			agentId: "agent-1",
			runRevision: 2,
			idempotencyKey: "budget-2",
		});
		expect(result.idempotentReplay).toBe(true);
		expect(result.cancelledHeartbeats).toBe(0);
	});
});
