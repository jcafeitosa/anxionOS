import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConsoleAccessContext } from "./console-access.ts";
import { consoleNavItems } from "./console-nav.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";

function ownerContext(): ConsoleAccessContext {
	return {
		authenticated: true,
		platformAccess: false,
		partnerAccess: false,
		membershipsActive: [{ agencyId: AGENCY_ID, role: "owner" }],
		decision: { kind: "owner", reason: "MEMBERSHIP_OWNER" },
	};
}

function operatorContext(): ConsoleAccessContext {
	return {
		authenticated: true,
		platformAccess: false,
		partnerAccess: false,
		membershipsActive: [{ agencyId: AGENCY_ID, role: "operator" }],
		decision: { kind: "operator", reason: "MEMBERSHIP_OPERATOR" },
	};
}

describe("consoleNavItems", () => {
	it("owner nav includes agency and never invents platform/partner", () => {
		const items = consoleNavItems("owner", ownerContext(), AGENCY_ID);
		assert.ok(items.some((item) => item.testId === "console-nav-owner-agency"));
		assert.ok(items.some((item) => item.id === "logout"));
		assert.equal(
			items.some((item) => item.href === "/platform" || item.href === "/partner"),
			false,
		);
	});

	it("operator nav has no Owner Equipe or /agency/ links", () => {
		const items = consoleNavItems("operator", operatorContext(), AGENCY_ID);
		assert.equal(
			items.some((item) => item.testId === "console-nav-owner-agency"),
			false,
		);
		assert.equal(
			items.some((item) => item.label === "Equipe" || item.label === "Owner Console"),
			false,
		);
		assert.equal(
			items.some((item) => item.href.includes("/agency/")),
			false,
		);
		assert.ok(items.some((item) => item.testId === "console-nav-operator-agency"));
	});

	it("platform and partner stay fail-closed without grant", () => {
		const items = consoleNavItems("operator", operatorContext(), AGENCY_ID);
		assert.equal(items.some((item) => item.id === "platform-console"), false);
		assert.equal(items.some((item) => item.id === "partner-console"), false);
	});
});
