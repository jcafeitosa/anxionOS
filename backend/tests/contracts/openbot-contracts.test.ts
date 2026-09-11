import { describe, expect, test } from "bun:test";
import {
	abortBotRunGenerationCommandSchema,
	acquireComputerSessionCommandSchema,
	botRunGenerationRefSchema,
	computerSessionRefSchema,
	computerSessionTakeoverPayloadSchema,
	governedToolCallResultSchema,
	invokeToolCallCommandSchema,
	OPENBOT_EVENT_TYPES,
	OPENBOT_TOOL_INVOKE_CAPABILITY,
	toolCallDecisionSchema,
	toolCallRequestSchema,
	toolAuditEntrySchema,
	toolInvocationDecisionSchema,
} from "@anxionos/contracts/openbot";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("openbot cross-module contracts (ANX-144 S1)", () => {
	test("toolCallRequestSchema requires uuid identifiers", () => {
		const result = toolCallRequestSchema.safeParse({
			requestId: "not-a-uuid",
			organizationId: "b2000002-0002-4002-8002-000000000002",
			agentId: "c3000003-0003-4003-8003-000000000003",
			toolName: "sandbox.echo",
			inputHash: "sha256:input",
		});
		expect(result.success).toBe(false);
	});

	test("toolCallDecisionSchema accepts DENY with rule id", () => {
		const parsed = toolCallDecisionSchema.parse({
			requestId: "e5000005-0005-4005-8005-000000000005",
			decision: "DENY",
			ruleId: "governance.grant.missing",
		});
		expect(parsed.decision).toBe("DENY");
	});

	test("toolInvocationDecisionSchema is exhaustive for gateway states", () => {
		expect(toolInvocationDecisionSchema.options).toEqual([
			"ALLOW",
			"DENY",
			"DEFER",
		]);
	});
});

describe("openbot S2 command/event contracts (ANX-144 S2)", () => {
	test("invokeToolCallCommandSchema extends toolCallRequest with commandId", () => {
		const parsed = invokeToolCallCommandSchema.parse({
			commandId: "a1000001-0001-4001-8001-000000000001",
			requestId: "e5000005-0005-4005-8005-000000000005",
			organizationId: "b2000002-0002-4002-8002-000000000002",
			agentId: "c3000003-0003-4003-8003-000000000003",
			toolName: "sandbox.health_probe",
			inputHash: "sha256:probe",
		});
		expect(parsed.commandId).toBe("a1000001-0001-4001-8001-000000000001");
	});

	test("governedToolCallResultSchema accepts DENY without effect", () => {
		const parsed = governedToolCallResultSchema.parse({
			commandId: "a1000001-0001-4001-8001-000000000001",
			requestId: "e5000005-0005-4005-8005-000000000005",
			decision: {
				requestId: "e5000005-0005-4005-8005-000000000005",
				decision: "DENY",
				ruleId: "governance.grant.missing",
			},
		});
		expect(parsed.effect).toBeUndefined();
	});

	test("OPENBOT_TOOL_INVOKE_CAPABILITY and event types are stable", () => {
		expect(OPENBOT_TOOL_INVOKE_CAPABILITY).toBe("agents.tools.invoke");
		expect(OPENBOT_EVENT_TYPES.TOOL_CALL_DENIED).toBe(
			"openbot.tool_call.denied.v1",
		);
		expect(OPENBOT_EVENT_TYPES.TOOL_CALL_FORWARDED).toBe(
			"openbot.tool_call.forwarded.v1",
		);
	});
});


describe("openbot S4 audit event contracts (ANX-144 S4)", () => {
	test("OPENBOT_EVENT_TYPES includes audit before/after recorded", () => {
		expect(OPENBOT_EVENT_TYPES.AUDIT_BEFORE_RECORDED).toBe(
			"openbot.audit.before_recorded.v1",
		);
		expect(OPENBOT_EVENT_TYPES.AUDIT_AFTER_RECORDED).toBe(
			"openbot.audit.after_recorded.v1",
		);
	});

	test("toolAuditEntrySchema accepts ruleId on denied before row", () => {
		const parsed = toolAuditEntrySchema.parse({
			auditId: "d4000004-0004-4004-8004-000000000004",
			requestId: "e5000005-0005-4005-8005-000000000005",
			phase: "before",
			organizationId: "b2000002-0002-4002-8002-000000000002",
			agentId: "c3000003-0003-4003-8003-000000000003",
			toolName: "sandbox.echo",
			decision: "DENY",
			ruleId: "governance.grant.missing",
			recordedAt: "2026-09-10T23:00:00.000Z",
		});
		expect(parsed.ruleId).toBe("governance.grant.missing");
	});
});


describe("openbot S5 takeover contracts (ANX-144 S5)", () => {
	test("computerSessionRefSchema requires authorityToken and controller", () => {
		const parsed = computerSessionRefSchema.parse({
			sessionId: "a1000001-0001-4001-8001-000000000001",
			organizationId: "b2000002-0002-4002-8002-000000000002",
			agentId: "c3000003-0003-4003-8003-000000000003",
			workspacePath: "/tmp/anxionos-openbot-sandbox/b200/c300",
			status: "active",
			authorityToken: "f8000008-0008-4008-8008-000000000008",
			controller: "bot",
		});
		expect(parsed.controller).toBe("bot");
	});
});


describe("openbot S6 generation fencing contracts (ANX-144 S6)", () => {
	test("botRunGenerationRefSchema requires runRevision fence fields", () => {
		const parsed = botRunGenerationRefSchema.parse({
			generationId: "a1000001-0001-4001-8001-000000000001",
			organizationId: "b2000002-0002-4002-8002-000000000002",
			agentId: "c3000003-0003-4003-8003-000000000003",
			runId: "f8000008-0008-4008-8008-000000000008",
			runRevision: 1,
			generationSequence: 1,
			status: "active",
			abortToken: "d4000004-0004-4004-8004-000000000004",
		});
		expect(parsed.runRevision).toBe(1);
	});

	test("OPENBOT_EVENT_TYPES includes bot run generation events", () => {
		expect(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ACQUIRED).toBe(
			"openbot.bot_run_generation.acquired.v1",
		);
		expect(OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ABORTED).toBe(
			"openbot.bot_run_generation.aborted.v1",
		);
	});
});

describe("OpenBot institutional UUID boundaries (ANX-444)", () => {
	test("invokeToolCallCommandSchema rejects nil commandId", () => {
		expect(
			invokeToolCallCommandSchema.safeParse({
				commandId: NIL_UUID,
				requestId: VALID_UUID,
				organizationId: VALID_UUID,
				agentId: VALID_UUID,
				toolName: "sandbox.echo",
				inputHash: "sha256:input",
			}).success,
		).toBe(false);
	});

	test("toolCallRequestSchema rejects v6+ organizationId", () => {
		expect(
			toolCallRequestSchema.safeParse({
				requestId: VALID_UUID,
				organizationId: V6_UUID,
				agentId: VALID_UUID,
				toolName: "sandbox.echo",
				inputHash: "sha256:input",
			}).success,
		).toBe(false);
	});

	test("acquireComputerSessionCommandSchema rejects non-RFC variant agentId", () => {
		expect(
			acquireComputerSessionCommandSchema.safeParse({
				commandId: VALID_UUID,
				organizationId: VALID_UUID,
				agentId: INVALID_VARIANT,
			}).success,
		).toBe(false);
	});

	test("abortBotRunGenerationCommandSchema rejects nil abortToken", () => {
		expect(
			abortBotRunGenerationCommandSchema.safeParse({
				commandId: VALID_UUID,
				generationId: VALID_UUID,
				organizationId: VALID_UUID,
				abortToken: NIL_UUID,
				runRevision: 1,
			}).success,
		).toBe(false);
	});

	test("computerSessionTakeoverPayloadSchema rejects v6+ operatorId", () => {
		expect(
			computerSessionTakeoverPayloadSchema.safeParse({
				commandId: VALID_UUID,
				session: {
					sessionId: VALID_UUID,
					organizationId: VALID_UUID,
					agentId: VALID_UUID,
					workspacePath: "/tmp/anxionos-openbot-sandbox",
					status: "active",
					authorityToken: VALID_UUID,
					controller: "human",
				},
				operatorId: V6_UUID,
				revokedAuthorityToken: VALID_UUID,
				previousController: "bot",
			}).success,
		).toBe(false);
	});

	test("botRunGenerationRefSchema accepts valid institutional UUIDs", () => {
		expect(
			botRunGenerationRefSchema.safeParse({
				generationId: VALID_UUID,
				organizationId: VALID_UUID,
				agentId: VALID_UUID,
				runId: VALID_UUID,
				runRevision: 1,
				generationSequence: 1,
				status: "active",
				abortToken: VALID_UUID,
			}).success,
		).toBe(true);
	});
});
