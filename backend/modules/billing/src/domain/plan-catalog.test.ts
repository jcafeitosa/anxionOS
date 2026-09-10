import { describe, expect, test } from "bun:test";
import {
	checkEntitlement,
	createPlanCatalog,
	getEntitlementsForPlan,
} from "./plan-catalog";

describe("plan catalog entitlements", () => {
	test("freemium limits maxAgents to 1", () => {
		const entitlements = getEntitlementsForPlan("freemium");
		expect(entitlements.maxAgents).toBe(1);
	});

	test("checkEntitlement allows usage within limit", () => {
		const result = checkEntitlement("trader", "maxConnections", 5);
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(5);
	});

	test("checkEntitlement rejects usage above limit", () => {
		const result = checkEntitlement("beginner", "maxAgents", 4);
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	test("createPlanCatalog returns all commercial tiers", () => {
		const catalog = createPlanCatalog();
		expect(Object.keys(catalog).sort()).toEqual([
			"beginner",
			"freemium",
			"pro",
			"trader",
		]);
	});
});
