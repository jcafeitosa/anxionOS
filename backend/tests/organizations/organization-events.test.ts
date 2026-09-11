import { describe, expect, test } from "bun:test";
import { createAgencyCreatedEvent } from "@anxionos/organizations";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("organization domain events", () => {
	test("createAgencyCreatedEvent copies agencyId onto envelope", () => {
		const event = createAgencyCreatedEvent({
			agencyId,
			ownerPrincipalId: principalId,
			displayName: "Test Agency",
			marketScope: "stocks",
			status: "ready",
			onboardingStep: "ready",
			revision: 1,
		});
		expect(event.agencyId).toBe(agencyId);
		expect(event.ownerDomain).toBe("organizations");
	});
});
