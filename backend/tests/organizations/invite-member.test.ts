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
const viewerPrincipalId = "22222222-2222-4222-8222-222222222222";

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

const viewerMembership: Membership = {
	...ownerMembership,
	id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	principalId: viewerPrincipalId,
	role: "viewer",
};

function createInviteDeps(seedMemberships: Membership[] = [ownerMembership]) {
	const agencyRepository = createInMemoryAgencyRepository([agency]);
	const membershipRepository =
		createInMemoryMembershipRepository(seedMemberships);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			inviteTokenHasher: createTestInviteTokenHasher(),
		},
		membershipRepository,
		published,
	};
}

describe("inviteMember", () => {
	test("owner invites member and emits membership invited event", async () => {
		const { deps, published } = createInviteDeps();
		const commandId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		const invited = await inviteMember(deps, {
			commandId,
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		expect(invited.result.aggregateId).toMatch(/^[0-9a-f-]{36}$/i);
		expect(invited.inviteToken.length).toBeGreaterThan(0);
		expect(published[0]?.eventType).toBe(
			ORGANIZATION_EVENT_TYPES.MEMBERSHIP_INVITED,
		);
	});

	test("duplicate pending invite is rejected", async () => {
		const pendingInvite: Membership = {
			id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
			agencyId,
			principalId: null,
			inviteEmail: "operator@example.com",
			inviteTokenHash: "hash",
			inviteExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
			role: "operator",
			status: "invited",
			invitedAt: new Date("2026-09-08T12:00:00.000Z"),
			joinedAt: null,
			revokedAt: null,
			revision: 1,
			createdAt: new Date("2026-09-08T12:00:00.000Z"),
			updatedAt: new Date("2026-09-08T12:00:00.000Z"),
		};
		const { deps } = createInviteDeps([ownerMembership, pendingInvite]);
		await expect(
			inviteMember(deps, {
				commandId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				agencyId,
				email: "operator@example.com",
				role: "operator",
				actorPrincipalId: ownerPrincipalId,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_MEMBERSHIP_EXISTS",
		});
	});

	test("viewer cannot invite members", async () => {
		const { deps } = createInviteDeps([ownerMembership, viewerMembership]);
		await expect(
			inviteMember(deps, {
				commandId: "10101010-1010-4010-8010-101010101010",
				agencyId,
				email: "operator@example.com",
				role: "operator",
				actorPrincipalId: viewerPrincipalId,
			}),
		).rejects.toBeInstanceOf(OrganizationCommandError);
	});

	test("commandId replay is idempotent without duplicate event", async () => {
		const { deps, published } = createInviteDeps();
		const commandId = "20202020-2020-4020-8020-202020202020";
		const first = await inviteMember(deps, {
			commandId,
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		const replay = await inviteMember(deps, {
			commandId,
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		expect(replay.result.aggregateId).toBe(first.result.aggregateId);
		expect(replay.result.revision).toBe(first.result.revision);
		expect(replay.result.idempotentReplay).toBe(true);
		expect(replay.inviteToken).toBe("");
		expect(published).toHaveLength(1);
	});
});
