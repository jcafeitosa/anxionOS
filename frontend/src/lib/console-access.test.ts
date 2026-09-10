import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canAccessConsole,
	type ConsoleAccessContext,
} from "./console-access.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";

function context(
	overrides: Partial<ConsoleAccessContext> & {
		decision: ConsoleAccessContext["decision"];
	},
): ConsoleAccessContext {
	return {
		authenticated: true,
		platformAccess: false,
		partnerAccess: false,
		membershipsActive: [
			{ agencyId: AGENCY_ID, role: "owner" },
		],
		...overrides,
	};
}

describe("canAccessConsole", () => {
	it("rejects MFA_REQUIRED (onboarding) even with owner membership", () => {
		const loaded = context({
			decision: { kind: "onboarding", reason: "MFA_REQUIRED" },
		});
		assert.equal(canAccessConsole(loaded, "owner", AGENCY_ID), false);
	});

	it("rejects PRINCIPAL_SUSPENDED (denied) even with owner membership", () => {
		const loaded = context({
			decision: { kind: "denied", reason: "PRINCIPAL_SUSPENDED" },
		});
		assert.equal(canAccessConsole(loaded, "owner", AGENCY_ID), false);
	});

	it("rejects denied and onboarding before membership lookup", () => {
		assert.equal(
			canAccessConsole(
				context({ decision: { kind: "denied", reason: "SESSION_MISSING" } }),
				"owner",
				AGENCY_ID,
			),
			false,
		);
		assert.equal(
			canAccessConsole(
				context({
					decision: { kind: "onboarding", reason: "NEEDS_ORGANIZATION" },
				}),
				"owner",
				AGENCY_ID,
			),
			false,
		);
	});

	it("allows select_organization when the agency membership matches owner", () => {
		const loaded = context({
			decision: { kind: "select_organization", reason: "SELECT_ORGANIZATION" },
			membershipsActive: [
				{ agencyId: AGENCY_ID, role: "owner" },
				{
					agencyId: "22222222-2222-4222-8222-222222222222",
					role: "operator",
				},
			],
		});
		assert.equal(canAccessConsole(loaded, "owner", AGENCY_ID), true);
	});

	it("rejects platform without grant (fail-closed)", () => {
		const loaded = context({
			platformAccess: false,
			decision: { kind: "owner", reason: "MEMBERSHIP_OWNER" },
		});
		assert.equal(canAccessConsole(loaded, "platform"), false);
	});

	it("rejects platform even if platformAccess is true but decision is not platform", () => {
		const loaded = context({
			platformAccess: true,
			decision: { kind: "operator", reason: "MEMBERSHIP_OPERATOR" },
			membershipsActive: [{ agencyId: AGENCY_ID, role: "operator" }],
		});
		assert.equal(canAccessConsole(loaded, "platform"), false);
	});

	it("allows operator membership on the operator console", () => {
		const loaded = context({
			decision: { kind: "operator", reason: "MEMBERSHIP_OPERATOR" },
			membershipsActive: [{ agencyId: AGENCY_ID, role: "operator" }],
		});
		assert.equal(canAccessConsole(loaded, "operator", AGENCY_ID), true);
		assert.equal(canAccessConsole(loaded, "owner", AGENCY_ID), false);
		assert.equal(canAccessConsole(loaded, "platform"), false);
	});

	it("rejects partner without grant (fail-closed)", () => {
		const loaded = context({
			partnerAccess: false,
			decision: { kind: "owner", reason: "MEMBERSHIP_OWNER" },
		});
		assert.equal(canAccessConsole(loaded, "partner"), false);
	});
});
