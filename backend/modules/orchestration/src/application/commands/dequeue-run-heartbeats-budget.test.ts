import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Run } from "../../domain/entities/run";
import type { RunHeartbeat } from "../../domain/entities/run-heartbeat";
import type { OperationalBudgetPort } from "../../domain/ports/operational-budget";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";

function createZeroCapBudget(): OperationalBudgetPort {
	return {
		async reserveWakeupUnit() {
			return false;
		},
		async remainingWakeupUnits() {
			return 0;
		},
	};
}

import { dequeueRunHeartbeats } from "./dequeue-run-heartbeats";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-10T12:00:00.000Z");

describe("dequeueRunHeartbeats budget pre-check", () => {
	test("budget exceeded stops run and cancels heartbeat", async () => {
		const runId = randomUUID();
		const heartbeatId = randomUUID();
		const run: Run = {
			id: runId,
			taskId: randomUUID(),
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
		const heartbeat: RunHeartbeat = {
			id: heartbeatId,
			runId,
			taskId: run.taskId,
			agentId: "agent-1",
			coalesceKey: "k",
			nextWakeAt: NOW,
			status: "pending",
			attempt: 0,
			createdAt: NOW,
			processedAt: null,
		};
		const events: unknown[] = [];
		const ctx: OrchestrationTransactionContext = {
			client: null,
			goalRepository: {} as OrchestrationTransactionContext["goalRepository"],
			taskRepository: {} as OrchestrationTransactionContext["taskRepository"],
			runRepository: {
				async findByRunId(id) {
					return id === runId ? run : null;
				},
				async save(next) {
					Object.assign(run, next);
					return next;
				},
			} as OrchestrationTransactionContext["runRepository"],
			taskLeaseRepository:
				{} as OrchestrationTransactionContext["taskLeaseRepository"],
			gateBindingRepository:
				{} as OrchestrationTransactionContext["gateBindingRepository"],
			commandJournal: {} as OrchestrationTransactionContext["commandJournal"],
			runHeartbeatRepository: {
				async save(next) {
					Object.assign(heartbeat, next);
					return next;
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
					return [heartbeat];
				},
				async cancelPendingForRun() {
					return 1;
				},
			} as OrchestrationTransactionContext["runHeartbeatRepository"],
			taskboardMirrorRepository:
				{} as OrchestrationTransactionContext["taskboardMirrorRepository"],
			async publishEvents(envelopes) {
				events.push(...envelopes);
			},
		};
		const unitOfWork: OrchestrationUnitOfWork = {
			async runInTransaction(work) {
				return work(ctx);
			},
		};
		const budget = createZeroCapBudget();
		const result = await dequeueRunHeartbeats(
			{
				unitOfWork,
				leaseClock: {
					now: () => NOW,
					expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs),
				},
				operationalBudget: budget,
			},
			{ limit: 10 },
		);
		expect(result.heartbeats).toHaveLength(0);
		expect(result.budgetStoppedRunIds).toEqual([runId]);
		expect(run.status).toBe("BUDGET_STOPPED");
		expect(heartbeat.status).toBe("cancelled");
		expect(events.length).toBe(1);
	});
});
