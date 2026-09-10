import { describe, expect, test } from "bun:test";
import {
	AGENTS_EVENT_TYPES,
	agentBudgetExhaustedPayloadSchema,
	agentRoutineRegisteredPayloadSchema,
	agentRoutineTriggeredPayloadSchema,
	consumeAgentBudgetCommandSchema,
	registerAgentRoutineCommandSchema,
	setAgentBudgetPolicyCommandSchema,
	triggerAgentRoutineCommandSchema,
} from "@anxionos/contracts/agents";

const commandId = "11111111-1111-4111-8111-111111111111";
const agentId = "22222222-2222-4222-8222-222222222222";
const routineId = "33333333-3333-4333-8333-333333333333";
const organizationId = "44444444-4444-4444-8444-444444444444";

describe("agents routines/budget command contracts (ANX-143 S11)", () => {
	test("registerAgentRoutineCommandSchema accepts schedule trigger", () => {
		const parsed = registerAgentRoutineCommandSchema.parse({
			commandId,
			agentId,
			slug: "daily-sync",
			displayName: "Daily Sync",
			triggerKind: "schedule",
			triggerConfig: { cron: "0 8 * * 1-5" },
		});
		expect(parsed.triggerKind).toBe("schedule");
	});

	test("triggerAgentRoutineCommandSchema requires dedupeKey", () => {
		const result = triggerAgentRoutineCommandSchema.safeParse({
			commandId,
			routineId,
			expectedRevision: 1,
		});
		expect(result.success).toBe(false);
	});

	test("setAgentBudgetPolicyCommandSchema validates caps", () => {
		const parsed = setAgentBudgetPolicyCommandSchema.parse({
			commandId,
			agentId,
			caps: { wakeupUnitCap: 100, tokenUnitCap: 50000, timeSecondsCap: 7200 },
		});
		expect(parsed.caps.wakeupUnitCap).toBe(100);
	});

	test("consumeAgentBudgetCommandSchema defaults zero units", () => {
		const parsed = consumeAgentBudgetCommandSchema.parse({
			commandId,
			agentId,
			expectedRevision: 2,
		});
		expect(parsed.wakeupUnits).toBe(0);
	});

	test("routine and budget event payloads parse", () => {
		expect(
			agentRoutineRegisteredPayloadSchema.parse({
				routineId,
				agentId,
				organizationId,
				slug: "heartbeat",
				displayName: "Heartbeat",
				triggerKind: "manual",
				triggerConfig: {},
				status: "active",
				revision: 1,
			}).status,
		).toBe("active");
		expect(
			agentRoutineTriggeredPayloadSchema.parse({
				routineId,
				agentId,
				organizationId,
				dedupeKey: "dedupe-1",
				runId: "55555555-5555-4555-8555-555555555555",
				revision: 2,
			}).dedupeKey,
		).toBe("dedupe-1");
		expect(
			agentBudgetExhaustedPayloadSchema.parse({
				agentId,
				organizationId,
				fromStatus: "active",
				toStatus: "exhausted",
				revision: 3,
			}).toStatus,
		).toBe("exhausted");
		expect(AGENTS_EVENT_TYPES.AGENT_ROUTINE_TRIGGERED).toBe(
			"agents.routine.triggered.v1",
		);
	});
});
