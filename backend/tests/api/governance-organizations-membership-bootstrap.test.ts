import { describe, expect, test } from "bun:test";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import { GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER } from "../../apps/api/src/governance/bootstrap-organizations-membership";

/** Minimal NATS filter matcher for unit tests (`.` token, `>` suffix wildcard). */
function natsFilterMatches(filter: string, subject: string): boolean {
	const parts = filter.split(".");
	const tokens = subject.split(".");
	let i = 0;
	for (const part of parts) {
		if (part === ">") {
			return i < tokens.length;
		}
		if (i >= tokens.length || tokens[i] !== part) {
			return false;
		}
		i += 1;
	}
	return i === tokens.length;
}

describe("governance organizations membership bootstrap", () => {
	test("JetStream filter covers agency-scoped membership and agency organization events", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const membershipActivated = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			agencyId,
		);
		const membershipRevoked = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
			agencyId,
		);
		const ownershipTransferred = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
			agencyId,
		);

		expect(GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER).toBe(
			"agency.>.events.organizations.>",
		);
		expect(
			natsFilterMatches(
				GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER,
				membershipActivated,
			),
		).toBe(true);
		expect(
			natsFilterMatches(
				GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER,
				membershipRevoked,
			),
		).toBe(true);
		expect(
			natsFilterMatches(
				GOVERNANCE_ORGANIZATIONS_SUBJECT_FILTER,
				ownershipTransferred,
			),
		).toBe(true);
		expect(ownershipTransferred).toBe(
			`agency.${agencyId}.events.${ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED}`,
		);
	});

	test("platform events.organizations filter does not match agency-scoped subjects", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const ownershipTransferred = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
			agencyId,
		);
		const legacyFilter = "events.organizations.>";
		expect(natsFilterMatches(legacyFilter, ownershipTransferred)).toBe(false);
	});

	test("membership-only agency filter misses ownership_transferred", () => {
		const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const ownershipTransferred = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
			agencyId,
		);
		const membershipActivated = resolveEventSubject(
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			agencyId,
		);
		const membershipFilter = `agency.${agencyId}.events.organizations.membership.>`;
		expect(natsFilterMatches(membershipFilter, membershipActivated)).toBe(true);
		expect(natsFilterMatches(membershipFilter, ownershipTransferred)).toBe(
			false,
		);
	});
});
