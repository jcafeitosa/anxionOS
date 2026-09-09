import { describe, expect, test } from "bun:test";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import { acceptInviteByToken, inviteMember } from "@anxionos/organizations";
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
const inviteePrincipalId = "33333333-3333-4333-8333-333333333333";

const agency: Agency = {
	id: agencyId,
	ownerPrincipalId,
	displayName: "Acme Capital",
	marketScope: { regions: ["US"], assetClasses: ["equity"] },
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

function createAcceptDeps(seedMemberships: Membership[] = [ownerMembership]) {
	const agencyRepository = createInMemoryAgencyRepository([agency]);
	const membershipRepository = createInMemoryMembershipRepository(seedMemberships);
	const commandJournal = createInMemoryCommandJournalRepository();
	const inviteTokenHasher = createTestInviteTokenHasher();
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
			inviteTokenHasher,
		},
		inviteDeps: {
			unitOfWork,
			commandJournal,
			inviteTokenHasher,
		},
		membershipRepository,
		published,
	};
}

describe("acceptInviteByToken", () => {
	test("accepts valid invite when session email matches", async () => {
		const { deps, inviteDeps, published } = createAcceptDeps();
		const invited = await inviteMember(inviteDeps, {
			commandId: "40404040-4040-4040-8040-404040404040",
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		const accepted = await acceptInviteByToken(deps, {
			commandId: "50505050-5050-4050-8050-505050505050",
			token: invited.inviteToken,
			sessionPrincipalId: inviteePrincipalId,
			sessionEmail: "operator@example.com",
		});
		expect(accepted.aggregateId).toBe(invited.result.aggregateId);
		expect(published.at(-1)?.eventType).toBe(ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED);
	});

	test("rejects session email mismatch", async () => {
		const { deps, inviteDeps } = createAcceptDeps();
		const invited = await inviteMember(inviteDeps, {
			commandId: "60606060-6060-4060-8060-606060606060",
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		await expect(
			acceptInviteByToken(deps, {
				commandId: "70707070-7070-4070-8070-707070707070",
				token: invited.inviteToken,
				sessionPrincipalId: inviteePrincipalId,
				sessionEmail: "other@example.com",
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_INVITE_EMAIL_MISMATCH",
		});
	});

	test("rejects expired invite", async () => {
		const inviteTokenHasher = createTestInviteTokenHasher();
		const token = "expired-token";
		const expiredMembership: Membership = {
			id: "80808080-8080-4080-8080-808080808080",
			agencyId,
			principalId: null,
			inviteEmail: "operator@example.com",
			inviteTokenHash: inviteTokenHasher.hash(token),
			inviteExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
			role: "operator",
			status: "invited",
			invitedAt: new Date("2020-01-01T00:00:00.000Z"),
			joinedAt: null,
			revokedAt: null,
			revision: 1,
			createdAt: new Date("2020-01-01T00:00:00.000Z"),
			updatedAt: new Date("2020-01-01T00:00:00.000Z"),
		};
		const { deps } = createAcceptDeps([ownerMembership, expiredMembership]);
		await expect(
			acceptInviteByToken(deps, {
				commandId: "90909090-9090-4090-8090-909090909090",
				token,
				sessionPrincipalId: inviteePrincipalId,
				sessionEmail: "operator@example.com",
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_INVITE_EXPIRED",
		});
	});

	test("concurrent accept yields single activation", async () => {
		const { deps, inviteDeps, published } = createAcceptDeps();
		const invited = await inviteMember(inviteDeps, {
			commandId: "a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0a0",
			agencyId,
			email: "operator@example.com",
			role: "operator",
			actorPrincipalId: ownerPrincipalId,
		});
		const results = await Promise.allSettled(
			Array.from({ length: 3 }, (_, index) =>
				acceptInviteByToken(deps, {
					commandId: `b0b0b0b0-b0b0-40b0-80b0-b0b0b0b0b0b${index}`,
					token: invited.inviteToken,
					sessionPrincipalId: inviteePrincipalId,
					sessionEmail: "operator@example.com",
				}),
			),
		);
		const fulfilled = results.filter((result) => result.status === "fulfilled");
		const rejected = results.filter((result) => result.status === "rejected");
		expect(fulfilled).toHaveLength(1);
		expect(rejected).toHaveLength(2);
		for (const failure of rejected) {
			expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(OrganizationCommandError);
		}
		const activationEvents = published.filter(
			(event) => event.eventType === ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
		);
		expect(activationEvents).toHaveLength(1);
	});
});
