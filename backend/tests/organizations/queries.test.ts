import { describe, expect, test } from "bun:test";
import {
	getAgencyById,
	getMembership,
	listAgenciesForPrincipal,
	listMembershipsByAgency,
} from "@anxionos/organizations";
import type { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryMembershipRepository,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherAgencyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const adminPrincipalId = "22222222-2222-4222-8222-222222222222";
const outsiderPrincipalId = "33333333-3333-4333-8333-333333333333";

const agency: Agency = {
	id: agencyId,
	ownerPrincipalId,
	displayName: "Acme Capital",
	marketScope: "both",
	status: "ready",
	onboardingStep: "ready",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

const otherAgency: Agency = {
	...agency,
	id: otherAgencyId,
	displayName: "Beta Capital",
};

const ownerMembership: Membership = {
	id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	agencyId,
	principalId: ownerPrincipalId,
	inviteEmail: null,
	inviteTokenHash: null,
	inviteExpiresAt: null,
	role: "owner",
	status: "active",
	invitedAt: null,
	joinedAt: new Date("2026-09-08T12:00:00.000Z"),
	revokedAt: null,
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	updatedAt: new Date("2026-09-08T12:00:00.000Z"),
};

const adminMembership: Membership = {
	...ownerMembership,
	id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
	principalId: adminPrincipalId,
	role: "admin",
};

const revokedMembership: Membership = {
	...ownerMembership,
	id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
	agencyId: otherAgencyId,
	principalId: ownerPrincipalId,
	status: "revoked",
	revokedAt: new Date("2026-09-08T13:00:00.000Z"),
};

const otherOwnerMembership: Membership = {
	...ownerMembership,
	id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
	agencyId: otherAgencyId,
};

function createQueryDeps(
	memberships: Membership[] = [ownerMembership, adminMembership],
	agencies: Agency[] = [agency, otherAgency],
) {
	const agencyRepository = createInMemoryAgencyRepository(agencies);
	const membershipRepository = createInMemoryMembershipRepository(memberships);
	return { agencyRepository, membershipRepository };
}

describe("organizations queries", () => {
	test("getAgencyById returns agency for scoped principal", async () => {
		const deps = createQueryDeps();
		const result = await getAgencyById(deps, {
			agencyId,
			actorPrincipalId: ownerPrincipalId,
		});
		expect(result.id).toBe(agencyId);
		expect(result.ownerPrincipalId).toBe(ownerPrincipalId);
		expect(result.marketScope).toBe("both");
	});

	test("getAgencyById rejects cross-tenant access", async () => {
		const deps = createQueryDeps();
		await expect(
			getAgencyById(deps, {
				agencyId,
				actorPrincipalId: outsiderPrincipalId,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_CROSS_TENANT",
		} satisfies Partial<OrganizationCommandError>);
	});

	test("listAgenciesForPrincipal returns only active memberships", async () => {
		const deps = createQueryDeps([
			ownerMembership,
			adminMembership,
			revokedMembership,
			otherOwnerMembership,
		]);
		const agencies = await listAgenciesForPrincipal(deps, {
			principalId: ownerPrincipalId,
		});
		expect(agencies.map((item) => item.id).sort()).toEqual(
			[agencyId, otherAgencyId].sort(),
		);
	});

	test("listMembershipsByAgency returns memberships for scoped principal", async () => {
		const deps = createQueryDeps();
		const memberships = await listMembershipsByAgency(deps, {
			agencyId,
			actorPrincipalId: adminPrincipalId,
		});
		expect(memberships).toHaveLength(2);
		expect(memberships.map((item) => item.role).sort()).toEqual([
			"admin",
			"owner",
		]);
	});

	test("getMembership returns membership for scoped principal", async () => {
		const deps = createQueryDeps();
		const membership = await getMembership(deps, {
			agencyId,
			membershipId: adminMembership.id,
			actorPrincipalId: ownerPrincipalId,
		});
		expect(membership.id).toBe(adminMembership.id);
		expect(membership.role).toBe("admin");
	});

	test("getMembership rejects cross-tenant access", async () => {
		const deps = createQueryDeps();
		await expect(
			getMembership(deps, {
				agencyId,
				membershipId: adminMembership.id,
				actorPrincipalId: outsiderPrincipalId,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_CROSS_TENANT",
		} satisfies Partial<OrganizationCommandError>);
	});
});
