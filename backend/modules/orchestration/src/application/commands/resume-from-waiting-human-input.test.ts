import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Run } from "../../domain/entities/run";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import { OrchestrationCommandError } from "../errors";
import { resumeFromWaitingHumanInput } from "./resume-from-waiting-human-input";

const ORG = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-09-10T12:00:00.000Z");

function baseRun(overrides: Partial<Run> = {}): Run {
	return {
		id: randomUUID(),
		taskId: randomUUID(),
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
			idempotencyKey: "idem-expected",
			requestedAt: NOW.toISOString(),
		},
		...overrides,
	};
}

function createDeps(run: Run) {
	let saved: Run | null = null;
	const journal: Array<Record<string, unknown>> = [];
	const ctx: OrchestrationTransactionContext = {
		client: null,
		goalRepository: {} as OrchestrationTransactionContext["goalRepository"],
		taskRepository: {} as OrchestrationTransactionContext["taskRepository"],
		runRepository: {
			async findById(_org, id) {
				return id === run.id ? run : null;
			},
			async save(next) {
				saved = next;
				return next;
			},
		} as OrchestrationTransactionContext["runRepository"],
		taskLeaseRepository: {} as OrchestrationTransactionContext["taskLeaseRepository"],
		gateBindingRepository: {} as OrchestrationTransactionContext["gateBindingRepository"],
		commandJournal: {
			async findByCommandId() {
				return null;
			},
			async record(entry) {
				journal.push(entry.responseSnapshot ?? {});
				return { ...entry, createdAt: NOW };
			},
		},
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
			commandJournal: ctx.commandJournal,
			leaseClock: { now: () => NOW, expiresIn: (ttlMs: number) => new Date(NOW.getTime() + ttlMs) },
		},
		getSaved: () => saved,
		getJournal: () => journal,
	};
}

describe("resumeFromWaitingHumanInput", () => {
	test("resumes run when idempotency key matches", async () => {
		const run = baseRun();
		const { deps, getSaved, getJournal } = createDeps(run);
		const result = await resumeFromWaitingHumanInput(deps, {
			runId: run.id,
			organizationId: ORG,
			operationId: "op-approve",
			idempotencyKey: "idem-expected",
		});
		expect(result.run.status).toBe("ACTIVE");
		expect(getSaved()?.waitingHuman).toBeNull();
		expect(getJournal()[0]?.requestHash).toBeString();
	});

	test("rejects wrong idempotencyKey", async () => {
		const run = baseRun();
		const { deps } = createDeps(run);
		await expect(
			resumeFromWaitingHumanInput(deps, {
				runId: run.id,
				organizationId: ORG,
				operationId: "op-approve",
				idempotencyKey: "idem-wrong",
			}),
		).rejects.toBeInstanceOf(OrchestrationCommandError);
	});
});
