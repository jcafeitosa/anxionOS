import { describe, expect, test } from "bun:test";
import { assertAgencyIsolation, createTwoDistinctAgencies } from "./test-support";

describe("multi-agency isolation fixtures", () => {
	test("Agency A and Agency B have distinct IDs", () => {
		const fixtures = createTwoDistinctAgencies();
		expect(fixtures.agencyIdA).not.toBe(fixtures.agencyIdB);
		expect(fixtures.agencyA.id).toBe(fixtures.agencyIdA);
		expect(fixtures.agencyB.id).toBe(fixtures.agencyIdB);
	});

	test("listing by owner returns only the scoped agency", async () => {
		const fixtures = createTwoDistinctAgencies();
		const agenciesA = await fixtures.agencyRepositoryA.findByOwnerPrincipalId(fixtures.agencyA.ownerPrincipalId);
		const agenciesB = await fixtures.agencyRepositoryB.findByOwnerPrincipalId(fixtures.agencyB.ownerPrincipalId);
		expect(agenciesA.map((agency) => agency.id)).toEqual([fixtures.agencyIdA]);
		expect(agenciesB.map((agency) => agency.id)).toEqual([fixtures.agencyIdB]);
	});

	test("Agency A cannot see Agency B and vice versa", async () => {
		const fixtures = createTwoDistinctAgencies();
		expect(await fixtures.agencyRepositoryA.findByAgencyId(fixtures.agencyIdB)).toBeNull();
		expect(await fixtures.agencyRepositoryB.findByAgencyId(fixtures.agencyIdA)).toBeNull();
	});

	test("same fixture context produces deterministic agency attributes", () => {
		const context = {
			agencyA: { displayName: "Agency A", marketScope: "stocks" },
			agencyB: { displayName: "Agency B", marketScope: "crypto" },
		};
		const first = createTwoDistinctAgencies(context);
		const second = createTwoDistinctAgencies(context);
		expect(first.agencyA.displayName).toBe(second.agencyA.displayName);
		expect(first.agencyA.marketScope).toEqual(second.agencyA.marketScope);
		expect(first.agencyB.displayName).toBe(second.agencyB.displayName);
		expect(first.agencyB.marketScope).toEqual(second.agencyB.marketScope);
	});

	test("isolation helper returns PASS for isolated agencies", async () => {
		const fixtures = createTwoDistinctAgencies();
		const isolation = await assertAgencyIsolation(fixtures.agencyA, fixtures.agencyB, fixtures.agencyRepositoryA, fixtures.agencyRepositoryB);
		expect(isolation.agencyAIsolated).toBe(true);
		expect(isolation.agencyBIsolated).toBe(true);
		expect(isolation.details.every((detail) => detail.startsWith("PASS"))).toBe(true);
	});
});
