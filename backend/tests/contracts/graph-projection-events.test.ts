/**
 * ANX-277 — contract tests for Product/Agent graph projection event payloads.
 * User instruction: ANX-277 projection worker sandbox after ADR0005 greenlight.
 */
import { describe, expect, test } from "bun:test";
import {
	AGENT_GRAPH_EVENT_TYPES,
	agentRoleAssignedPayloadSchema,
	decisionRecordedPayloadSchema,
	graphQueryEnvelopeSchema,
	nodeKeySchema,
	PRODUCT_GRAPH_EVENT_TYPES,
	workItemStatusChangedPayloadSchema,
} from "@anxionos/contracts/graph";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("graph projection event contracts (ANX-277)", () => {
	test("PRODUCT_GRAPH_EVENT_TYPES uses versioned event names", () => {
		expect(PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED).toBe(
			"product.work_item.status_changed.v1",
		);
	});

	test("AGENT_GRAPH_EVENT_TYPES uses versioned event names", () => {
		expect(AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED).toBe(
			"agents.decision.recorded.v1",
		);
		expect(AGENT_GRAPH_EVENT_TYPES.AGENT_ROLE_ASSIGNED).toBe(
			"agents.agent.role_assigned.v1",
		);
	});

	test("workItemStatusChangedPayloadSchema accepts valid payload", () => {
		const parsed = workItemStatusChangedPayloadSchema.parse({
			workItemId: "22222222-2222-4222-8222-222222222222",
			companyId: "11111111-1111-4111-8111-111111111111",
			status: "in_progress",
			revision: 1,
		});
		expect(parsed.status).toBe("in_progress");
	});

	test("decisionRecordedPayloadSchema rejects missing revision", () => {
		const result = decisionRecordedPayloadSchema.safeParse({
			decisionId: "44444444-4444-4444-8444-444444444444",
			scopeId: "33333333-3333-4333-8333-333333333333",
			status: "accepted",
		});
		expect(result.success).toBe(false);
	});

	test("INTELLIGENCE_FEEDS_BACK event name is versioned", () => {
		expect(PRODUCT_GRAPH_EVENT_TYPES.INTELLIGENCE_FEEDS_BACK).toBe(
			"product.intelligence.feeds_back.v1",
		);
	});

	test("decisionRecordedPayloadSchema accepts approverAgentId", () => {
		const parsed = decisionRecordedPayloadSchema.parse({
			decisionId: "44444444-4444-4444-8444-444444444444",
			scopeId: "33333333-3333-4333-8333-333333333333",
			status: "accepted",
			revision: 1,
			approverAgentId: "66666666-6666-4666-8666-666666666666",
		});
		expect(parsed.approverAgentId).toBe("66666666-6666-4666-8666-666666666666");
	});

	test("agentRoleAssignedPayloadSchema defaults status to active", () => {
		const parsed = agentRoleAssignedPayloadSchema.parse({
			agentRoleId: "55555555-5555-4555-8555-555555555555",
			companyId: "11111111-1111-4111-8111-111111111111",
			agentId: "66666666-6666-4666-8666-666666666666",
			personaSlug: "backend-executor",
			revision: 1,
		});
		expect(parsed.status).toBe("active");
	});
});

describe("graph institutional UUID boundaries (ANX-444 batch 8)", () => {
	test("nodeKeySchema rejects nil scopeId", () => {
		expect(
			nodeKeySchema.safeParse({
				scopeType: "AGENCY",
				scopeId: NIL_UUID,
				type: "WorkItem",
				id: VALID_UUID,
			}).success,
		).toBe(false);
	});

	test("workItemStatusChangedPayloadSchema rejects v6+ companyId", () => {
		expect(
			workItemStatusChangedPayloadSchema.safeParse({
				workItemId: VALID_UUID,
				companyId: V6_UUID,
				status: "in_progress",
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("decisionRecordedPayloadSchema rejects non-RFC variant scopeId", () => {
		expect(
			decisionRecordedPayloadSchema.safeParse({
				decisionId: VALID_UUID,
				scopeId: INVALID_VARIANT,
				status: "accepted",
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("graphQueryEnvelopeSchema rejects nil clientQueryId when provided", () => {
		expect(
			graphQueryEnvelopeSchema.safeParse({
				clientQueryId: NIL_UUID,
				scope: {
					principalId: VALID_UUID,
					actingScope: { scopeType: "AGENCY", scopeId: VALID_UUID },
				},
				temporal: { validAt: "2026-01-01T00:00:00.000Z" },
				params: {},
			}).success,
		).toBe(false);
	});

	test("agentRoleAssignedPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			agentRoleAssignedPayloadSchema.safeParse({
				agentRoleId: VALID_UUID,
				companyId: VALID_UUID,
				agentId: VALID_UUID,
				personaSlug: "backend-executor",
				revision: 1,
			}).success,
		).toBe(true);
	});
});
