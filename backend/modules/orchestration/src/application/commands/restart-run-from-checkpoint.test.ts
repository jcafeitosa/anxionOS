import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { GateBinding } from "../../domain/entities/gate-binding";
import type { Run } from "../../domain/entities/run";
import type { TaskWithLease } from "../../domain/entities/task";
import type { TaskLease } from "../../domain/entities/task-lease";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import {
	buildRestartRunFromCheckpointCommandId,
	hashCommandPayload,
} from "../command-support";
import { OrchestrationCommandError } from "../errors";
import { restartRunFromCheckpoint } from "./restart-run-from-checkpoint";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function baseGateBinding(runId: string): GateBinding {
	return {
		id: randomUUID(),
		organizationId: ORG,
		gateId: "G1",
		issueIdentifier: "ANX-140",
		runId,
		disposition: "PASS",
		reviewerId: "reviewer-1",
		artifactDigest: "a".repeat(64),
		artifactRevision: 1,
		notApplicableReason: null,
		hierarchyModeAtRecord: "HIERARCHY_CIRCULAR",
		schemaVersion: "1.0.0",
		recordedAt: NOW,
		invalidatedAt: null,
	};
}

function createHarness(input: {
	run: Run;
	task: TaskWithLease;
	gateBindings: GateBinding[];
}) {
	const events: unknown[] = [];
	const commandJournal = new Map<string, Record<string, unknown>>();
	const gateBindings = [...input.gateBindings];
	const ctx: OrchestrationTransactionContext = {
		client: null,
		goalRepository: {} as OrchestrationTransactionContext["goalRepository"],
		taskRepository: {
			async findByIdForUpdate(_org, id) {
				return id === input.task.id ? input.task : null;
			},
			async save(next) {
				Object.assign(input.task, next);
				return next;
			},
		} as OrchestrationTransactionContext["taskRepository"],
		runRepository: {
			async findById(_org, id) {
				return id === input.run.id ? input.run : null;
			},
			async save(next) {
				Object.assign(input.run, next);
				return next;
			},
		} as OrchestrationTransactionContext["runRepository"],
		taskLeaseRepository:
			{} as OrchestrationTransactionContext["taskLeaseRepository"],
		gateBindingRepository: {
			async listByIssue(_org, issueIdentifier) {
				return gateBindings.filter(
					(binding) => binding.issueIdentifier === issueIdentifier,
				);
			},
		} as OrchestrationTransactionContext["gateBindingRepository"],
		commandJournal: {
			async findByCommandId(id) {
				const row = commandJournal.get(id);
				return row
					? {
							commandId: id,
							commandName: "RestartRunFromCheckpoint",
							aggregateId: input.run.id,
							aggregateType: "Run",
							revision: input.run.revision,
							responseSnapshot: row,
							createdAt: NOW,
						}
					: null;
			},
			async record(entry) {
				commandJournal.set(entry.commandId, entry.responseSnapshot ?? {});
				return { ...entry, createdAt: NOW };
			},
		},
		runHeartbeatRepository:
			{} as OrchestrationTransactionContext["runHeartbeatRepository"],
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
	return {
		deps: {
			unitOfWork,
			commandJournal: ctx.commandJournal,
			leaseClock: {
				now: () => NOW,
				expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs),
			},
		},
		events,
		getRun: () => input.run,
		getGateBindings: () => gateBindings,
	};
}

function orphanFixture(leaseToken: string) {
	const taskId = randomUUID();
	const runId = randomUUID();
	const run: Run = {
		id: runId,
		taskId,
		agentId: "agent-1",
		organizationId: ORG,
		goalAncestry: [randomUUID()],
		issueIdentifier: "ANX-140",
		parentRunId: null,
		status: "ORPHANED",
		coalesceKey: "ck-1",
		revision: 4,
		startedAt: NOW,
		completedAt: NOW,
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
		issueIdentifier: "ANX-140",
		title: "checkpoint restart",
		checkoutStatus: "LEASED",
		revision: 2,
		createdAt: NOW,
		updatedAt: NOW,
		lease,
	};
	return { run, task, lease };
}

describe("restartRunFromCheckpoint", () => {
	test("resumes ORPHANED run with valid leaseToken and preserves gate bindings", async () => {
		const leaseToken = randomUUID();
		const { run, task } = orphanFixture(leaseToken);
		const gateBindings = [baseGateBinding(run.id)];
		const harness = createHarness({ run, task, gateBindings });
		const result = await restartRunFromCheckpoint(harness.deps, {
			organizationId: ORG,
			taskId: task.id,
			runId: run.id,
			agentId: "agent-1",
			runRevision: 4,
			leaseToken,
			idempotencyKey: "restart-1",
		});
		expect(result.run.status).toBe("ACTIVE");
		expect(result.leaseToken).toBe(leaseToken);
		expect(harness.getRun().completedAt).toBeNull();
		expect(harness.getRun().revision).toBe(5);
		expect(harness.getGateBindings()).toEqual(gateBindings);
		expect(harness.events.length).toBe(1);
	});

	test("rejects stale leaseToken", async () => {
		const leaseToken = randomUUID();
		const { run, task } = orphanFixture(leaseToken);
		const harness = createHarness({ run, task, gateBindings: [] });
		await expect(
			restartRunFromCheckpoint(harness.deps, {
				organizationId: ORG,
				taskId: task.id,
				runId: run.id,
				agentId: "agent-1",
				runRevision: 4,
				leaseToken: randomUUID(),
				idempotencyKey: "restart-stale",
			}),
		).rejects.toMatchObject({ orchestrationCode: "ORC_LEASE_STALE" });
	});

	test("rejects command journal hash mismatch", async () => {
		const leaseToken = randomUUID();
		const { run, task } = orphanFixture(leaseToken);
		const harness = createHarness({ run, task, gateBindings: [] });
		const command = {
			organizationId: ORG,
			taskId: task.id,
			runId: run.id,
			agentId: "agent-1",
			runRevision: 4,
			leaseToken,
			idempotencyKey: "restart-hash",
		};
		const commandId = buildRestartRunFromCheckpointCommandId(
			command.idempotencyKey,
			command.runId,
		);
		await harness.deps.commandJournal.record({
			commandId,
			commandName: "RestartRunFromCheckpoint",
			aggregateId: run.id,
			aggregateType: "Run",
			revision: run.revision,
			responseSnapshot: {
				run: { id: run.id },
				leaseToken,
				idempotentReplay: false,
				requestHash: "deadbeef",
			},
		});
		await expect(
			restartRunFromCheckpoint(harness.deps, command),
		).rejects.toMatchObject({
			orchestrationCode: "ORC_COMMAND_HASH_MISMATCH",
		});
	});

	test("idempotent replay returns prior result", async () => {
		const leaseToken = randomUUID();
		const { run, task } = orphanFixture(leaseToken);
		const harness = createHarness({ run, task, gateBindings: [] });
		const command = {
			organizationId: ORG,
			taskId: task.id,
			runId: run.id,
			agentId: "agent-1",
			runRevision: 4,
			leaseToken,
			idempotencyKey: "restart-replay",
		};
		const first = await restartRunFromCheckpoint(harness.deps, command);
		const second = await restartRunFromCheckpoint(harness.deps, command);
		expect(second.idempotentReplay).toBe(true);
		expect(second.run.status).toBe(first.run.status);
		expect(harness.events).toHaveLength(1);
	});
});
