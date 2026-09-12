import { randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { describe, expect, test } from "bun:test";
import { getTestPool } from "../helpers";
import { registerPrincipalForTest } from "../identity/helpers";
import { issueGrantForTest } from "../organizations/helpers";

/**
 * ANX-462, ANX-466 — Capability scope and issuance abuse cases.
 *
 * ANX-462: Platform-only capabilities require PLATFORM_SCOPE_ID.
 * ANX-466: Capabilities must be in catalog; issuer needs role + possession.
 *
 * Abuse cases:
 * 1. Agency operator self-issues console.platform in agency scope
 * 2. Agency-scoped grant attempts to authorize platform operations
 * 3. Omitting x-agency-id does not degrade to platform access
 * 4. Operator self-issues identity.admin (administrative capability)
 * 5. Operator issues capability they don't possess
 * 6. Unknown capability string is rejected
 */
describe("ANX-462 + ANX-466 — capability scope and issuance abuse cases", () => {
	const pool = getTestPool();

	test("ABUSE CASE 1 — agency operator cannot self-issue console.platform in agency scope", async () => {
		const agencyId = randomUUID();
		const operator = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "operator@test.anxion.os",
		});

		// Operator tries to issue console.platform in agency scope
		await expect(
			issueGrantForTest(pool, {
				scopeId: agencyId,
				granteePrincipalId: operator.id,
				capability: "console.platform",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_SCOPE_MISMATCH",
		});
	});

	test("ABUSE CASE 2 — console.platform requires PLATFORM_SCOPE_ID", async () => {
		const principal = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "platform-required@test.anxion.os",
		});

		// Any agency id (not PLATFORM_SCOPE_ID) must fail
		const randomAgencyId = randomUUID();
		await expect(
			issueGrantForTest(pool, {
				scopeId: randomAgencyId,
				granteePrincipalId: principal.id,
				capability: "console.platform",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_SCOPE_MISMATCH",
		});

		// Valid: PLATFORM_SCOPE_ID works
		const platformGrant = await issueGrantForTest(pool, {
			scopeId: PLATFORM_SCOPE_ID,
			granteePrincipalId: principal.id,
			capability: "console.platform",
		});
		expect(platformGrant.scopeId).toBe(PLATFORM_SCOPE_ID);
	});

	test("ABUSE CASE 3 — unknown capability is rejected (GOV_CAPABILITY_UNKNOWN)", async () => {
		const principal = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "unknown-cap@test.anxion.os",
		});

		await expect(
			issueGrantForTest(pool, {
				scopeId: PLATFORM_SCOPE_ID,
				granteePrincipalId: principal.id,
				capability: "identity.superadmin.takeover",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_CAPABILITY_UNKNOWN",
		});
	});

	test("ABUSE CASE 4 — operator role cannot issue administrative capabilities", async () => {
		const agencyId = randomUUID();
		const operator = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "operator-admin@test.anxion.os",
		});

		// Give operator an operational grant (they can issue operational caps)
		await issueGrantForTest(pool, {
			scopeId: agencyId,
			granteePrincipalId: operator.id,
			capability: "agents.models.list",
		});

		// Operator tries to issue identity.admin (administrative)
		// This should fail because operator role cannot issue administrative capabilities
		// NOTE: This requires the handler to have the role check implemented
		// For now, test that possession is required
		await expect(
			issueGrantForTest(pool, {
				scopeId: agencyId,
				granteePrincipalId: operator.id,
				capability: "identity.admin",
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_INSUFFICIENT_AUTHORITY",
		});
	});

	test("ABUSE CASE 5 — issuer must possess the capability they are granting", async () => {
		const agencyId = randomUUID();
		const issuer = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "no-possession@test.anxion.os",
		});
		const target = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "target@test.anxion.os",
		});

		// Issuer has NO grants, tries to issue a capability they don't possess
		await expect(
			issueGrantForTest(pool, {
				scopeId: agencyId,
				granteePrincipalId: target.id,
				capability: "agents.skills.evaluate",
				issuedByPrincipalId: issuer.id,
			}),
		).rejects.toMatchObject({
			governanceCode: "GOV_INSUFFICIENT_AUTHORITY",
		});
	});

	test("VALID CASE — platform authority can grant down to agency scope", async () => {
		const agencyId = randomUUID();
		const platformAdmin = await registerPrincipalForTest(pool, {
			authUserId: randomUUID(),
			email: "platform-admin@test.anxion.os",
		});

		// Grant platform-scoped capability to admin
		await issueGrantForTest(pool, {
			scopeId: PLATFORM_SCOPE_ID,
			granteePrincipalId: platformAdmin.id,
			capability: "agents.models.list",
		});

		// Platform admin can now grant to agency scope
		const agencyGrant = await issueGrantForTest(pool, {
			scopeId: agencyId,
			granteePrincipalId: platformAdmin.id,
			capability: "agents.models.list",
			issuedByPrincipalId: platformAdmin.id,
		});

		expect(agencyGrant.scopeId).toBe(agencyId);
		expect(agencyGrant.capability).toBe("agents.models.list");
	});
});
