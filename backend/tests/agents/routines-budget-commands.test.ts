import { describe, expect, test } from "bun:test";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
import {
	AgentsCommandError,
	consumeAgentBudget,
	pauseAgentRoutine,
	registerAgent,
	registerAgentRoutine,
	resumeAgentRoutine,
	setAgentBudgetPolicy,
	triggerAgentRoutine,
} from "@anxionos/agents";
import {
	createInMemoryAgentBudgetRepository,
	createInMemoryAgentRepository,
	createInMemoryAgentRoutineRepository,
	createInMemoryCommandJournalRepository,
	createRecordingAgentsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function seedAgent() {
	const agentRepository = createInMemoryAgentRepository();
	await agentRepository.save({
		id: agentId,
		organizationId,
		kind: "AGENCY",
		displayName: "Ops Agent",
		status: "ACTIVE",
		revision: 1,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	return agentRepository;
}

function createRoutineDeps(agentRepository: ReturnType<typeof createInMemoryAgentRepository>) {
	const agentRoutineRepository = createInMemoryAgentRoutineRepository();
	const agentBudgetRepository = createInMemoryAgentBudgetRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingAgentsUnitOfWork({
		agentRepository,
		agentVersionRepository: {
			async save(v) {
				return v;
			},
			async findById() {
				return null;
			},
			async findByAgentAndVersionNumber() {
				return null;
			},
			async listByAgentId() {
				return [];
			},
		},
		agentRoutineRepository,
		agentBudgetRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			agentRepository,
			agentRoutineRepository,
			agentBudgetRepository,
		},
		published,
	};
}

describe("registerAgentRoutine (S11)", () => {
	test("creates routine and emits registered event", async () => {
		const agentRepository = await seedAgent();
		const { deps, published } = createRoutineDeps(agentRepository);
		const result = await registerAgentRoutine(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			agentId,
			slug: "daily-standup",
			displayName: "Daily Standup",
			triggerKind: "schedule",
			triggerConfig: { cron: "0 9 * * *" },
			organizationId,
		});
		expect(result.revision).toBe(1);
		expect(published[0]?.eventType).toBe(AGENTS_EVENT_TYPES.AGENT_ROUTINE_REGISTERED);
	});
});

describe("triggerAgentRoutine idempotency (S11)", () => {
	test("same dedupeKey replays without new run side effect", async () => {
		const agentRepository = await seedAgent();
		const { deps } = createRoutineDeps(agentRepository);
		await setAgentBudgetPolicy(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			agentId,
			caps: { wakeupUnitCap: 10, tokenUnitCap: 1000, timeSecondsCap: 3600 },
		});
		const registered = await registerAgentRoutine(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			agentId,
			slug: "heartbeat",
			displayName: "Heartbeat",
			triggerKind: "manual",
			organizationId,
		});
		const first = await triggerAgentRoutine(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			routineId: registered.aggregateId,
			dedupeKey: "trigger-2026-09-10T09:00:00Z",
			expectedRevision: 1,
		});
		const second = await triggerAgentRoutine(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			routineId: registered.aggregateId,
			dedupeKey: "trigger-2026-09-10T09:00:00Z",
			expectedRevision: 2,
		});
		expect(first.runId).toBeDefined();
		expect(second.runId).toBe(first.runId);
		expect(second.idempotentReplay).toBe(true);
	});
});

describe("pauseAgentRoutine user intervention (S11)", () => {
	test("paused routine rejects trigger", async () => {
		const agentRepository = await seedAgent();
		const { deps } = createRoutineDeps(agentRepository);
		await setAgentBudgetPolicy(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			agentId,
			caps: { wakeupUnitCap: 5, tokenUnitCap: 500, timeSecondsCap: 600 },
		});
		const registered = await registerAgentRoutine(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			agentId,
			slug: "review",
			displayName: "Review",
			triggerKind: "manual",
			organizationId,
		});
		await pauseAgentRoutine(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			routineId: registered.aggregateId,
			expectedRevision: 1,
		});
		await expect(
			triggerAgentRoutine(deps, {
				commandId: "99999999-9999-4999-8999-999999999999",
				routineId: registered.aggregateId,
				dedupeKey: "manual-1",
				expectedRevision: 2,
			}),
		).rejects.toBeInstanceOf(AgentsCommandError);
		await resumeAgentRoutine(deps, {
			commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
			routineId: registered.aggregateId,
			expectedRevision: 2,
		});
		const resumed = await triggerAgentRoutine(deps, {
			commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac",
			routineId: registered.aggregateId,
			dedupeKey: "manual-2",
			expectedRevision: 3,
		});
		expect(resumed.runId).toBeDefined();
	});
});

describe("consumeAgentBudget (S11)", () => {
	test("budget exhaustion pauses agent", async () => {
		const agentRepository = await seedAgent();
		const { deps, published } = createRoutineDeps(agentRepository);
		await setAgentBudgetPolicy(deps, {
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc",
			agentId,
			caps: { wakeupUnitCap: 1, tokenUnitCap: 1, timeSecondsCap: 1 },
		});
		const consumed = await consumeAgentBudget(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccd",
			agentId,
			expectedRevision: 1,
			wakeupUnits: 1,
		});
		expect(consumed.status).toBe("exhausted");
		expect(published.some((e) => e.eventType === AGENTS_EVENT_TYPES.AGENT_BUDGET_EXHAUSTED)).toBe(true);
		const agent = await agentRepository.findById(agentId);
		expect(agent?.status).toBe("PAUSED");
	});
});
