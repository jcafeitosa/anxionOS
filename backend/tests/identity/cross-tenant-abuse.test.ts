import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import type { Principal } from "@anxionos/identity";
import {
	assertTargetInDeclaredAgency,
	assertAgencyMembership,
} from "../../apps/api/src/identity/authorization";

const agencyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const alicePrincipal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "alice-auth",
	email: "alice@agency-a.test",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date(),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

const bobPrincipal: Principal = {
	id: "22222222-2222-4222-8222-222222222222",
	authUserId: "bob-auth",
	email: "bob@agency-b.test",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date(),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

/**
 * ANX-465 — Cross-tenant isolation abuse cases.
 *
 * Maya critique: Replace theater test with executable abuse cases.
 *
 * Enforcement: backend/apps/api/src/identity/authorization.ts
 * - assertAgencyMembership: Caller must be member of declared agency
 * - assertTargetInDeclaredAgency: Target must belong to declared agency
 * - Multi-agency principals require PLATFORM authority
 *
 * Abuse cases:
 * 1. Agency A actor cannot declare membership they don't have
 * 2. Agency A actor cannot read/suspend principal belonging only to agency B
 * 3. Multi-agency principal requires PLATFORM scope (no agencyId)
 */
describe("ANX-465 — cross-tenant isolation", () => {
	function createAgencyScope(
		principalAgencies: Map<string, string[]> = new Map(),
	) {
		return {
			async isMember(agencyId: string, principalId: string): Promise<boolean> {
				const agencies = principalAgencies.get(principalId) ?? [];
				return agencies.includes(agencyId);
			},
			async listAgencyIdsForPrincipal(principalId: string): Promise<string[]> {
				return principalAgencies.get(principalId) ?? [];
			},
		};
	}

	test("ABUSE CASE 1 — actor cannot declare agency membership they don't have", async () => {
		// Alice is member of agency A only
		const agencyScope = createAgencyScope(
			new Map([[alicePrincipal.id, [agencyA]]]),
		);

		// Alice tries to declare agency B (cross-tenant attempt)
		await expect(
			assertAgencyMembership(
				{ agencyScope },
				agencyB, // Alice is not a member of B
				alicePrincipal.id,
			),
		).rejects.toMatchObject({
			identityCode: "IDN_CROSS_TENANT",
		});
	});

	test("ABUSE CASE 2 — agency A actor cannot suspend principal belonging only to agency B", async () => {
		// Alice in agency A, Bob in agency B (no overlap)
		const agencyScope = createAgencyScope(
			new Map([
				[alicePrincipal.id, [agencyA]],
				[bobPrincipal.id, [agencyB]],
			]),
		);

		// Alice (from agency A) tries to suspend Bob (from agency B)
		await expect(
			assertTargetInDeclaredAgency(
				{ agencyScope },
				agencyA, // Alice's scope
				bobPrincipal.id, // Bob doesn't belong to A
			),
		).rejects.toMatchObject({
			identityCode: "IDN_CROSS_TENANT",
		});
	});

	test("ABUSE CASE 3 — multi-agency principal requires PLATFORM scope", async () => {
		// Bob belongs to both agency A and B
		const agencyScope = createAgencyScope(
			new Map([
				[alicePrincipal.id, [agencyA]],
				[bobPrincipal.id, [agencyA, agencyB]], // Multi-agency
			]),
		);

		// Alice (agency A scope) tries to suspend Bob (who has B membership too)
		await expect(
			assertTargetInDeclaredAgency(
				{ agencyScope },
				agencyA, // Agency-scoped authority
				bobPrincipal.id, // Bob belongs to another agency
			),
		).rejects.toMatchObject({
			identityCode: "IDN_CROSS_TENANT",
		});
	});

	test("VALID CASE — PLATFORM scope (no agencyId) can operate on any principal", async () => {
		// Bob belongs to multiple agencies
		const agencyScope = createAgencyScope(
			new Map([[bobPrincipal.id, [agencyA, agencyB]]]),
		);

		// Platform authority (no agencyId) can operate on Bob
		await expect(
			assertTargetInDeclaredAgency(
				{ agencyScope },
				undefined, // PLATFORM scope
				bobPrincipal.id,
			),
		).resolves.toBeUndefined(); // No error
	});
});
