import { describe, expect, test } from "bun:test";
import {
	assignAutonomyLevelCommandSchema,
	GOVERNANCE_EVENT_TYPES,
	governanceScopeKindSchema,
	grantIssuedPayloadSchema,
	issueGrantCommandSchema,
	mandateIssuedPayloadSchema,
	resolveApprovalCommandSchema,
	transitionAutonomyLevelCommandSchema,
} from "@anxionos/contracts/governance";

const VALID_UUID = "a1234567-89ab-4def-8123-456789abcdef";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const V6_UUID = "6ba7b810-9dad-61d1-80b4-00c04fd430c8";
const INVALID_VARIANT = "ffffffff-ffff-ffff-ffff-ffffffffffff";

describe("Governance institutional UUID boundaries (ANX-444)", () => {
	test("issueGrantCommandSchema rejects nil commandId", () => {
		expect(
			issueGrantCommandSchema.safeParse({
				commandId: NIL_UUID,
				scopeId: VALID_UUID,
				granteePrincipalId: VALID_UUID,
				capability: "market.observe",
			}).success,
		).toBe(false);
	});

	test("issueGrantCommandSchema rejects v6+ scopeId", () => {
		expect(
			issueGrantCommandSchema.safeParse({
				commandId: VALID_UUID,
				scopeId: V6_UUID,
				granteePrincipalId: VALID_UUID,
				capability: "market.observe",
			}).success,
		).toBe(false);
	});

	test("resolveApprovalCommandSchema rejects non-RFC variant changeProposalId", () => {
		expect(
			resolveApprovalCommandSchema.safeParse({
				commandId: VALID_UUID,
				changeProposalId: INVALID_VARIANT,
				decision: "APPROVED",
			}).success,
		).toBe(false);
	});

	test("assignAutonomyLevelCommandSchema rejects nil subjectAgentId", () => {
		expect(
			assignAutonomyLevelCommandSchema.safeParse({
				commandId: VALID_UUID,
				scopeId: VALID_UUID,
				subjectAgentId: NIL_UUID,
				level: "L1",
			}).success,
		).toBe(false);
	});

	test("transitionAutonomyLevelCommandSchema rejects nil actorPrincipalId", () => {
		expect(
			transitionAutonomyLevelCommandSchema.safeParse({
				commandId: VALID_UUID,
				scopeId: VALID_UUID,
				subjectAgentId: VALID_UUID,
				targetLevel: "L2",
				transitionKind: "promote",
				actorPrincipalId: NIL_UUID,
			}).success,
		).toBe(false);
	});

	test("grantIssuedPayloadSchema accepts valid institutional UUIDs", () => {
		expect(
			grantIssuedPayloadSchema.safeParse({
				grantId: VALID_UUID,
				scopeId: VALID_UUID,
				granteePrincipalId: VALID_UUID,
				capability: "portfolio.read",
				status: "active",
				authorityEpoch: 1,
				revision: 1,
			}).success,
		).toBe(true);
	});

	test("grantIssuedPayloadSchema rejects nil grantId", () => {
		expect(
			grantIssuedPayloadSchema.safeParse({
				grantId: NIL_UUID,
				scopeId: VALID_UUID,
				granteePrincipalId: VALID_UUID,
				capability: "portfolio.read",
				status: "active",
				authorityEpoch: 1,
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("mandateIssuedPayloadSchema rejects v6+ agentId", () => {
		expect(
			mandateIssuedPayloadSchema.safeParse({
				mandateId: VALID_UUID,
				agencyId: VALID_UUID,
				agentId: V6_UUID,
				mandateKind: "operator",
				grantId: VALID_UUID,
				revision: 1,
			}).success,
		).toBe(false);
	});

	test("governance event type constants remain stable", () => {
		expect(GOVERNANCE_EVENT_TYPES.GRANT_ISSUED).toBe(
			"governance.grant.issued.v1",
		);
		expect(GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED).toBe(
			"governance.autonomy.transitioned.v1",
		);
	});

	test("assignAutonomyLevelCommandSchema accepts optional approvalId when valid", () => {
		expect(
			assignAutonomyLevelCommandSchema.safeParse({
				commandId: VALID_UUID,
				scopeId: VALID_UUID,
				subjectAgentId: VALID_UUID,
				level: "L2",
				approvalId: VALID_UUID,
			}).success,
		).toBe(true);
	});

	test("assignAutonomyLevelCommandSchema rejects nil optional approvalId", () => {
		expect(
			assignAutonomyLevelCommandSchema.safeParse({
				commandId: VALID_UUID,
				scopeId: VALID_UUID,
				subjectAgentId: VALID_UUID,
				level: "L2",
				approvalId: NIL_UUID,
			}).success,
		).toBe(false);
	});

	/**
	 * ANX-469 — `organization` era valor morto do enum (sem produtor, sem dono e
	 * sem consumidor de autorizacao). O contrato so' admite `agency|platform`.
	 */
	test("governanceScopeKindSchema so' admite agency e platform", () => {
		expect(governanceScopeKindSchema.safeParse("agency").success).toBe(true);
		expect(governanceScopeKindSchema.safeParse("platform").success).toBe(true);
		expect(governanceScopeKindSchema.safeParse("organization").success).toBe(
			false,
		);
	});
});
