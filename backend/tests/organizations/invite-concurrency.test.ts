/** Scope: in-memory repositories only — not PostgreSQL unique-index concurrency. */
import { describe, expect, test } from "bun:test";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import { inviteMember } from "@anxionos/organizations";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createTestInviteTokenHasher,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";

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

const ownerMembership: Membership = {
	id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
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

describe("organizations invite concurrency", () => {
	test("serial duplicate invites for same email yield one membership", async () => {
		const agencyRepository = createInMemoryAgencyRepository([agency]);
		const membershipRepository = createInMemoryMembershipRepository([
			ownerMembership,
		]);
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
			agencyRepository,
			ownerRepository: createInMemoryOwnerRepository(),
			membershipRepository,
			commandJournal,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			inviteTokenHasher: createTestInviteTokenHasher(),
		};
		const first = await inviteMember(deps, {
			commandId: "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0",
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		await expect(
			inviteMember(deps, {
				commandId: "d0d0d0d0-d0d0-40d0-80d0-d0d0d0d0d0d0",
				agencyId,
				email: "operator@example.com",
				role: "operator",
				actorPrincipalId: ownerPrincipalId,
			}),
		).rejects.toBeInstanceOf(OrganizationCommandError);
		const invitedMemberships = (
			await membershipRepository.listByAgency(agencyId)
		).filter((membership) => membership.status === "invited");
		expect(invitedMemberships).toHaveLength(1);
		expect(invitedMemberships[0]?.id).toBe(first.result.aggregateId);
		expect(
			published.filter(
				(event) =>
					event.eventType === ORGANIZATION_EVENT_TYPES.MEMBERSHIP_INVITED,
			),
		).toHaveLength(1);
	});
});
