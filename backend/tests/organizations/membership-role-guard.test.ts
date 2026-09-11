import { describe, expect, test } from "bun:test";
import {
	AGENCY_MUTATION_ROLES,
	assertActorCanMutate,
	assertActorIsOwnerOrAdmin,
} from "../../modules/organizations/src/application/services/membership-role-guard";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import { createInMemoryMembershipRepository } from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function activeMembership(
	role: Membership["role"],
	principalId: string,
): Membership {
	const now = new Date("2026-09-11T00:00:00.000Z");
	return {
		id: `${role}-${principalId}`,
		agencyId,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status: "active",
		invitedAt: null,
		joinedAt: now,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

describe("membership role guard (ANX-255)", () => {
	test("AGENCY_MUTATION_ROLES includes owner, admin, operator", () => {
		expect(AGENCY_MUTATION_ROLES).toEqual(["owner", "admin", "operator"]);
	});

	describe("assertActorCanMutate", () => {
		test("rejects viewer with ORG_CROSS_TENANT", async () => {
			const viewerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
			const repo = createInMemoryMembershipRepository([
				activeMembership("viewer", viewerId),
			]);
			await expect(
				assertActorCanMutate(repo, viewerId, agencyId),
			).rejects.toMatchObject({
				organizationCode: "ORG_CROSS_TENANT",
				statusCode: 403,
			});
		});

		test("rejects missing membership", async () => {
			const repo = createInMemoryMembershipRepository();
			await expect(
				assertActorCanMutate(
					repo,
					"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
					agencyId,
				),
			).rejects.toMatchObject({ organizationCode: "ORG_CROSS_TENANT" });
		});

		test.each([
			["owner", "dddddddd-dddd-4ddd-8ddd-dddddddddd01"],
			["admin", "dddddddd-dddd-4ddd-8ddd-dddddddddd02"],
			["operator", "dddddddd-dddd-4ddd-8ddd-dddddddddd03"],
		] as const)("%s passes mutation guard", async (role, principalId) => {
			const repo = createInMemoryMembershipRepository([
				activeMembership(role, principalId),
			]);
			const membership = await assertActorCanMutate(
				repo,
				principalId,
				agencyId,
			);
			expect(membership.role).toBe(role);
		});
	});

	describe("assertActorIsOwnerOrAdmin", () => {
		test("rejects operator role", async () => {
			const operatorId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
			const repo = createInMemoryMembershipRepository([
				activeMembership("operator", operatorId),
			]);
			await expect(
				assertActorIsOwnerOrAdmin(repo, operatorId, agencyId),
			).rejects.toMatchObject({ organizationCode: "ORG_CROSS_TENANT" });
		});

		test.each([
			["owner", "ffffffff-ffff-4fff-8fff-fffffffffff1"],
			["admin", "ffffffff-ffff-4fff-8fff-fffffffffff2"],
		] as const)("%s passes owner/admin guard", async (role, principalId) => {
			const repo = createInMemoryMembershipRepository([
				activeMembership(role, principalId),
			]);
			const membership = await assertActorIsOwnerOrAdmin(
				repo,
				principalId,
				agencyId,
			);
			expect(membership.role).toBe(role);
		});
	});
});
