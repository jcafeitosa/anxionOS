import { describe, expect, test } from "bun:test";
import { assertActorCanMutate } from "@anxionos/organizations";
import { mapGovernanceError } from "../../apps/api/src/governance/error-handler";
import { GovernanceCommandError } from "../../modules/governance/src/application/errors";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import { createInMemoryMembershipRepository } from "../organizations/test-support";

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

describe("governance POST RBAC (ANX-443)", () => {
	test("viewer membership is rejected with 403 via assertActorCanMutate", async () => {
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
		const mapped = mapGovernanceError(
			await assertActorCanMutate(repo, viewerId, agencyId).catch(
				(error) => error,
			),
		);
		expect(mapped.status).toBe(403);
	});

	test("operator membership passes mutation guard", async () => {
		const operatorId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const repo = createInMemoryMembershipRepository([
			activeMembership("operator", operatorId),
		]);
		const membership = await assertActorCanMutate(repo, operatorId, agencyId);
		expect(membership.role).toBe("operator");
	});

	test.each([
		["owner", "dddddddd-dddd-4ddd-8ddd-dddddddddd01"],
		["admin", "dddddddd-dddd-4ddd-8ddd-dddddddddd02"],
		["operator", "dddddddd-dddd-4ddd-8ddd-dddddddddd03"],
	] as const)(
		"%s membership passes mutation guard",
		async (role, principalId) => {
			const repo = createInMemoryMembershipRepository([
				activeMembership(role, principalId),
			]);
			const membership = await assertActorCanMutate(
				repo,
				principalId,
				agencyId,
			);
			expect(membership.role).toBe(role);
		},
	);

	test("GOV_CAPABILITY_SCOPE_MISMATCH vira 409 com o codigo preservado (ANX-462)", () => {
		// O comando rejeita `console.platform` com escopo de agencia; aqui se
		// prova que a borda HTTP nao degrada isso para 500 nem para 200.
		const mapped = mapGovernanceError(
			new GovernanceCommandError(
				"GOV_CAPABILITY_SCOPE_MISMATCH",
				"Capability console.platform requires PLATFORM scope",
			),
		);
		expect(mapped.status).toBe(409);
		expect(mapped.body.error.details.code).toBe(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
		);
	});
});
