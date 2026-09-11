import { describe, expect, test } from "bun:test";
import {
	isAdministrativeGrantCapability,
	OWNER_AUTHORITY_CAPABILITIES,
} from "@anxionos/contracts/governance";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import {
	hasOwnerAuthority,
	requiresOwnerApproval,
} from "../../modules/governance/src/domain/policies/owner-approval-policy";

function grantWith(capability: string): Grant {
	const now = new Date("2026-09-11T12:00:00.000Z");
	return {
		id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		tenantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		agencyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		scopeId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		scopeKind: "agency",
		granteePrincipalId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
		granteeAgentId: null,
		capability,
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: null,
		derivedFromMembershipId: null,
		issuedByPrincipalId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

/**
 * ANX-466 (G5 FURO 1) — a lista de autoridade de owner vive em contrato
 * (`OWNER_AUTHORITY_CAPABILITIES`) e e' a mesma usada pela classe
 * administrativa. Enquanto `owner.read` ficou de fora, um `operator` a emitia
 * a terceiro e o terceiro passava a aprovar proposta institucional.
 */
describe("owner approval policy (ANX-466, G5 FURO 1)", () => {
	test("cada token da lista unica confere autoridade de owner", () => {
		for (const capability of OWNER_AUTHORITY_CAPABILITIES) {
			expect(hasOwnerAuthority([grantWith(capability)])).toBe(true);
		}
	});

	test("a mesma lista e' classificada administrativa (uma fonte so')", () => {
		for (const capability of OWNER_AUTHORITY_CAPABILITIES) {
			expect(isAdministrativeGrantCapability(capability)).toBe(true);
		}
	});

	test("capability fora da lista nao confere autoridade de owner", () => {
		expect(hasOwnerAuthority([grantWith("identity.admin")])).toBe(false);
		expect(hasOwnerAuthority([grantWith("agents.publish")])).toBe(false);
	});

	test("grant inativo nao confere autoridade de owner", () => {
		expect(
			hasOwnerAuthority([{ ...grantWith("owner.read"), status: "revoked" }]),
		).toBe(false);
	});

	test("apenas INSTITUTIONAL/HIERARCHY_MODE exigem aprovacao de owner", () => {
		expect(requiresOwnerApproval("INSTITUTIONAL")).toBe(true);
		expect(requiresOwnerApproval("HIERARCHY_MODE")).toBe(true);
		expect(requiresOwnerApproval("SOFTWARE")).toBe(false);
	});
});
