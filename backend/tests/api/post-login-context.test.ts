import { describe, expect, test } from "bun:test";
import { decidePostLoginContext } from "../../apps/api/src/auth/post-login-context";

const now = new Date("2026-09-10T12:00:00.000Z");
const agencyA = "11111111-1111-4111-8111-111111111111";
const agencyB = "22222222-2222-4222-8222-222222222222";
const principal = {
	id: "33333333-3333-4333-8333-333333333333",
	authUserId: "auth-user-1",
	email: "owner@example.test",
	displayName: "Owner",
	status: "active" as const,
};

function decide(
	overrides: Partial<Parameters<typeof decidePostLoginContext>[0]> = {},
) {
	return decidePostLoginContext({
		authenticated: true,
		emailVerified: true,
		mfaRequired: false,
		principal,
		membershipsActive: [],
		membershipsPending: [],
		platformAccess: false,
		partnerAccess: false,
		now,
		...overrides,
	});
}

describe("decidePostLoginContext", () => {
	test("unauthenticated is fail-closed denied", () => {
		const ctx = decide({ authenticated: false, principal: null });
		expect(ctx.authenticated).toBe(false);
		expect(ctx.principal).toBeNull();
		expect(ctx.decision).toEqual({ kind: "denied", reason: "SESSION_MISSING" });
	});

	test("missing principal is denied", () => {
		const ctx = decide({ principal: null });
		expect(ctx.decision.reason).toBe("PRINCIPAL_MISSING");
		expect(ctx.decision.kind).toBe("denied");
	});

	test("suspended principal is denied", () => {
		const ctx = decide({
			principal: { ...principal, status: "suspended" },
		});
		expect(ctx.decision.reason).toBe("PRINCIPAL_SUSPENDED");
	});

	test("MFA required precedes email and memberships", () => {
		const ctx = decide({
			mfaRequired: true,
			emailVerified: false,
			membershipsActive: [{ agencyId: agencyA, role: "owner" }],
		});
		expect(ctx.decision).toEqual({
			kind: "onboarding",
			reason: "MFA_REQUIRED",
		});
	});

	test("unverified email precedes memberships", () => {
		const ctx = decide({
			emailVerified: false,
			membershipsActive: [{ agencyId: agencyA, role: "owner" }],
		});
		expect(ctx.decision.reason).toBe("EMAIL_UNVERIFIED");
	});

	test("pending invite without active membership is onboarding", () => {
		const ctx = decide({
			membershipsPending: [
				{
					agencyId: agencyA,
					role: "operator",
					inviteEmail: principal.email,
					inviteExpiresAt: "2026-12-01T00:00:00.000Z",
				},
			],
		});
		expect(ctx.decision.reason).toBe("INVITE_PENDING");
	});

	test("expired invite is ignored", () => {
		const ctx = decide({
			membershipsPending: [
				{
					agencyId: agencyA,
					inviteExpiresAt: "2020-01-01T00:00:00.000Z",
				},
			],
		});
		expect(ctx.decision.reason).toBe("NEEDS_ORGANIZATION");
	});

	test("does not invent PLATFORM access", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "owner" }],
		});
		expect(ctx.platformAccess).toBe(false);
		expect(ctx.decision.kind).toBe("owner");
	});

	test("explicit platform grant wins over membership", () => {
		const ctx = decide({
			platformAccess: true,
			membershipsActive: [{ agencyId: agencyA, role: "owner" }],
		});
		expect(ctx.decision).toEqual({
			kind: "platform",
			reason: "PLATFORM_GRANT",
		});
	});

	test("partner access when no platform grant", () => {
		const ctx = decide({ partnerAccess: true });
		expect(ctx.decision).toEqual({ kind: "partner", reason: "PARTNER_ACCESS" });
	});

	test("single owner membership routes to owner console", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "owner" }],
		});
		expect(ctx.decision).toMatchObject({
			kind: "owner",
			agencyId: agencyA,
			role: "owner",
			reason: "MEMBERSHIP_OWNER",
		});
	});

	test("admin maps to owner console", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "admin" }],
		});
		expect(ctx.decision.kind).toBe("owner");
		expect(ctx.decision.reason).toBe("MEMBERSHIP_ADMIN");
	});

	test("operator maps to operator console", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "operator" }],
		});
		expect(ctx.decision.kind).toBe("operator");
	});

	test("viewer maps to operator console", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "viewer" }],
		});
		expect(ctx.decision.kind).toBe("operator");
		expect(ctx.decision.reason).toBe("MEMBERSHIP_VIEWER");
	});

	test("unknown role like trader is ignored", () => {
		const ctx = decide({
			membershipsActive: [{ agencyId: agencyA, role: "trader" }],
		});
		expect(ctx.membershipsActive).toEqual([]);
		expect(ctx.decision.reason).toBe("NEEDS_ORGANIZATION");
	});

	test("multiple memberships select organization", () => {
		const ctx = decide({
			membershipsActive: [
				{ agencyId: agencyA, role: "owner" },
				{ agencyId: agencyB, role: "operator" },
			],
		});
		expect(ctx.decision.kind).toBe("select_organization");
	});
});
