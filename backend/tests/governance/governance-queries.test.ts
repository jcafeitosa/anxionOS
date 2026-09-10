import { describe, expect, test } from "bun:test";
import {
	getAuthorityEpoch,
	listEffectiveGrants,
	type Grant,
} from "@anxionos/governance";
import {
	createInMemoryAuthorityEpochStore,
	createInMemoryGrantRepository,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "11111111-1111-4111-8111-111111111111";

function seedGrant(overrides: Partial<Grant> = {}): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: principalId,
		granteeAgentId: null,
		capability: "owner.read",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date("2027-09-10T12:00:00.000Z"),
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

describe("listEffectiveGrants", () => {
	test("returns active non-expired grants for principal", async () => {
		const grantRepository = createInMemoryGrantRepository([seedGrant()]);
		const grants = await listEffectiveGrants(
			{ grantRepository },
			{ scopeId, principalId },
		);
		expect(grants).toHaveLength(1);
	});

	test("excludes expired grants at asOf", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({
				validUntil: new Date("2026-09-01T00:00:00.000Z"),
			}),
		]);
		const grants = await listEffectiveGrants(
			{ grantRepository },
			{
				scopeId,
				principalId,
				asOf: new Date("2026-09-10T12:00:00.000Z"),
			},
		);
		expect(grants).toHaveLength(0);
	});
});

describe("getAuthorityEpoch", () => {
	test("returns epoch record for scope", async () => {
		const authorityEpochStore = createInMemoryAuthorityEpochStore([
			{
				scopeId,
				tenantId: scopeId,
				agencyId: scopeId,
				epoch: 7,
				updatedAt: new Date(),
			},
		]);
		const record = await getAuthorityEpoch(
			{ authorityEpochStore },
			scopeId,
		);
		expect(record.epoch).toBe(7);
	});
});
