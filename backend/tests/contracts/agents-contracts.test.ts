import { describe, expect, test } from "bun:test";
import {
	AGENTS_EVENT_TYPES,
	agentRegisteredPayloadSchema,
	agentRoutineTriggeredPayloadSchema,
	brainInvocationRequestedPayloadSchema,
	evaluationRefSchema,
	registerAgentCommandSchema,
	skillRefSchema,
	transitionAgentStatusCommandSchema,
	triggerAgentRoutineResultSchema,
} from "@anxionos/contracts/agents";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("Agents institutional UUID boundaries (ANX-444)", () => {
	test("registerAgentCommandSchema rejects nil commandId", () => {
		expect(
			registerAgentCommandSchema.safeParse({
				commandId: NIL_UUID,
				displayName: "Research Agent",
				kind: "AGENCY",
			}).success,
		).toBe(false);
	});

	test("registerAgentCommandSchema rejects nil optional agencyId", () => {
		expect(
			registerAgentCommandSchema.safeParse({
				commandId: VALID_UUID,
				displayName: "Research Agent",
				kind: "AGENCY",
				agencyId: NIL_UUID,
			}).success,
		).toBe(false);
	});

	test("transitionAgentStatusCommandSchema rejects v6+ agentId", () => {
		expect(
			transitionAgentStatusCommandSchema.safeParse({
				commandId: VALID_UUID,
				agentId: V6_UUID,
				expectedRevision: 1,
				targetStatus: "ACTIVE",
			}).success,
		).toBe(false);
	});

	test("triggerAgentRoutineResultSchema rejects nil optional runId", () => {
		expect(
			triggerAgentRoutineResultSchema.safeParse({
				routineId: VALID_UUID,
				revision: 1,
				dedupeKey: "daily-scan",
				runId: NIL_UUID,
			}).success,
		).toBe(false);
	});

	test("agentRegisteredPayloadSchema rejects non-RFC variant agentId", () => {
		expect(
			agentRegisteredPayloadSchema.safeParse({
				agentId: INVALID_VARIANT,
				organizationId: VALID_UUID,
				kind: "AGENCY",
				displayName: "Research Agent",
				status: "DRAFT",
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("agentRegisteredPayloadSchema accepts valid optional agencyId", () => {
		expect(
			agentRegisteredPayloadSchema.safeParse({
				agentId: VALID_UUID,
				organizationId: VALID_UUID,
				agencyId: VALID_UUID,
				kind: "AGENCY",
				displayName: "Research Agent",
				status: "DRAFT",
				revision: 1,
			}).success,
		).toBe(true);
	});

	test("brainInvocationRequestedPayloadSchema rejects v6+ invocationId", () => {
		expect(
			brainInvocationRequestedPayloadSchema.safeParse({
				invocationId: V6_UUID,
				agentId: VALID_UUID,
				agentVersionId: VALID_UUID,
				organizationId: VALID_UUID,
				capabilityId: "brain.analyze",
				correlationId: "corr-1",
			}).success,
		).toBe(false);
	});

	test("agentRoutineTriggeredPayloadSchema rejects nil runId when provided", () => {
		expect(
			agentRoutineTriggeredPayloadSchema.safeParse({
				routineId: VALID_UUID,
				agentId: VALID_UUID,
				organizationId: VALID_UUID,
				dedupeKey: "daily-scan",
				runId: NIL_UUID,
				revision: 2,
			}).success,
		).toBe(false);
	});

	test("skillRefSchema rejects nil skillId", () => {
		expect(
			skillRefSchema.safeParse({
				skillId: NIL_UUID,
				schemaVersion: "1.0.0",
			}).success,
		).toBe(false);
	});

	test("evaluationRefSchema rejects invalid variant evaluationId", () => {
		expect(
			evaluationRefSchema.safeParse({
				evaluationId: INVALID_VARIANT,
				rubricVersion: "rubric-v1",
				outcome: "pass",
				evidenceHash: "sha256:evidence",
			}).success,
		).toBe(false);
	});

	test("agents event type constants remain stable", () => {
		expect(AGENTS_EVENT_TYPES.AGENT_REGISTERED).toBe(
			"agents.agent.registered.v1",
		);
		expect(AGENTS_EVENT_TYPES.AGENT_BUDGET_EXHAUSTED).toBe(
			"agents.budget.exhausted.v1",
		);
	});
});
