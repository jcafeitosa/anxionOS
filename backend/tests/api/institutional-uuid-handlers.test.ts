import { describe, expect, test } from "bun:test";
import { agentIdParamSchema } from "../../apps/api/src/agents/handlers/agents";
import {
	skillIdParamSchema,
	skillVersionIdParamSchema,
} from "../../apps/api/src/agents/handlers/skills";
import { changeProposalItemSchema } from "../../apps/api/src/governance/handlers/change-proposals";
import {
	agentIdParamSchema as autonomyAgentIdParamSchema,
	evaluateAutonomyBodySchema,
} from "../../apps/api/src/governance/handlers/autonomy";
import { authorizationCanBodySchema } from "../../apps/api/src/governance/handlers/authorization-can";
import {
	agencyIdParamSchema,
	grantIdParamSchema,
} from "../../apps/api/src/governance/handlers/grants";
import { organizationIdParamSchema } from "../../apps/api/src/partners/handlers/read";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";

describe("API handler institutional UUID boundaries (ANX-446)", () => {
	test("agentIdParamSchema rejects nil agentId", () => {
		expect(agentIdParamSchema.safeParse({ agentId: NIL_UUID }).success).toBe(false);
	});

	test("skillIdParamSchema rejects v6+ skillId", () => {
		expect(skillIdParamSchema.safeParse({ skillId: V6_UUID }).success).toBe(false);
	});

	test("skillVersionIdParamSchema rejects nil skillVersionId", () => {
		expect(
			skillVersionIdParamSchema.safeParse({ skillVersionId: NIL_UUID }).success,
		).toBe(false);
	});

	test("agencyIdParamSchema accepts institutional UUID", () => {
		expect(agencyIdParamSchema.safeParse({ agencyId: VALID_UUID }).success).toBe(
			true,
		);
	});

	test("grantIdParamSchema rejects nil grantId", () => {
		expect(grantIdParamSchema.safeParse({ grantId: NIL_UUID }).success).toBe(false);
	});

	test("evaluateAutonomyBodySchema rejects nil subjectAgentId", () => {
		expect(
			evaluateAutonomyBodySchema.safeParse({
				agencyId: VALID_UUID,
				subjectAgentId: NIL_UUID,
				capability: "strategy.research",
			}).success,
		).toBe(false);
	});

	test("autonomy agentIdParamSchema rejects v6+ agentId", () => {
		expect(
			autonomyAgentIdParamSchema.safeParse({ agentId: V6_UUID }).success,
		).toBe(false);
	});

	test("authorizationCanBodySchema rejects nil agencyId", () => {
		expect(
			authorizationCanBodySchema.safeParse({
				agencyId: NIL_UUID,
				actorId: VALID_UUID,
				action: "owner.read",
				resourceNodeKey: {
					scopeType: "AGENCY",
					scopeId: VALID_UUID,
					type: "account",
					id: VALID_UUID,
				},
				validAt: "2026-09-10T12:00:00.000Z",
			}).success,
		).toBe(false);
	});

	test("changeProposalItemSchema rejects nil tenantId", () => {
		expect(
			changeProposalItemSchema.safeParse({
				id: VALID_UUID,
				tenantId: NIL_UUID,
				agencyId: VALID_UUID,
				scopeId: VALID_UUID,
				kind: "INSTITUTIONAL",
				payloadHash: "sha256:demo",
				proposerPrincipalId: VALID_UUID,
				status: "pending",
				requiredApprovals: 1,
				revision: 1,
				createdAt: "2026-09-10T12:00:00.000Z",
				updatedAt: "2026-09-10T12:00:00.000Z",
			}).success,
		).toBe(false);
	});

	test("organizationIdParamSchema rejects nil organizationId", () => {
		expect(
			organizationIdParamSchema.safeParse({ organizationId: NIL_UUID }).success,
		).toBe(false);
	});
});
