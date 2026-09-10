import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PostLoginAuthContext } from "./auth.ts";
import {
	authorizationFreshness,
	ownerDashboardModel,
} from "./owner-dashboard.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const NOW = Date.parse("2026-09-10T20:00:00.000Z");

function context(
	overrides: Partial<PostLoginAuthContext> = {},
): PostLoginAuthContext {
	return {
		authenticated: true,
		emailVerified: true,
		mfaRequired: false,
		principal: {
			id: "p1",
			authUserId: "u1",
			email: "owner@anxionos.local",
			displayName: "Owner",
		},
		membershipsActive: [{ agencyId: AGENCY_ID, role: "owner", status: "active" }],
		membershipsPending: [],
		platformAccess: false,
		partnerAccess: false,
		onboardingState: { needsProfile: false, needsOrganization: false },
		decision: {
			kind: "owner",
			agencyId: AGENCY_ID,
			role: "owner",
			reason: "MEMBERSHIP_OWNER",
		},
		authorization: {
			policyVersion: "post-login.v1",
			generatedAt: "2026-09-10T19:59:00.000Z",
			expiresAt: "2026-09-10T20:01:00.000Z",
		},
		...overrides,
	};
}

describe("authorizationFreshness", () => {
	it("returns unknown when TTL is absent", () => {
		assert.equal(authorizationFreshness(undefined, NOW), "unknown");
		assert.equal(authorizationFreshness({}, NOW), "unknown");
	});

	it("returns stale when expiresAt is invalid or elapsed", () => {
		assert.equal(
			authorizationFreshness({ expiresAt: "not-a-date" }, NOW),
			"stale",
		);
		assert.equal(
			authorizationFreshness({ expiresAt: "2026-09-10T19:59:59.000Z" }, NOW),
			"stale",
		);
	});

	it("returns fresh when expiresAt is in the future", () => {
		assert.equal(
			authorizationFreshness({ expiresAt: "2026-09-10T20:00:01.000Z" }, NOW),
			"fresh",
		);
	});
});

describe("ownerDashboardModel", () => {
	it("projects membership and fail-closed platform/partner from the loader", () => {
		const model = ownerDashboardModel(context(), AGENCY_ID, NOW);
		assert.equal(model.membershipRole, "owner");
		assert.equal(model.platformAccess, false);
		assert.equal(model.partnerAccess, false);
		assert.equal(model.freshness, "fresh");
		assert.equal(model.pendingCount, 0);
		assert.equal(model.policyVersion, "post-login.v1");
	});

	it("counts pending invites for the agency without inventing grants", () => {
		const model = ownerDashboardModel(
			context({
				membershipsPending: [
					{ agencyId: AGENCY_ID, role: "operator", inviteEmail: "op@x.local" },
					{ agencyId: "22222222-2222-4222-8222-222222222222" },
				],
			}),
			AGENCY_ID,
			NOW,
		);
		assert.equal(model.pendingCount, 1);
		assert.equal(model.platformAccess, false);
	});

	it("marks stale when authorization TTL elapsed", () => {
		const model = ownerDashboardModel(
			context({
				authorization: {
					policyVersion: "post-login.v1",
					generatedAt: "2026-09-10T19:00:00.000Z",
					expiresAt: "2026-09-10T19:01:00.000Z",
				},
			}),
			AGENCY_ID,
			NOW,
		);
		assert.equal(model.freshness, "stale");
	});
});
