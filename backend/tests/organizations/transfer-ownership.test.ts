import { describe, expect, test } from "bun:test";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import { transferOwnership } from "@anxionos/organizations";
import type { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createStubPrincipalLookup,
} from "./test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ownerPrincipalId = "11111111-1111-4111-8111-111111111111";
const successorPrincipalId = "22222222-2222-4222-8222-222222222222";
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

const successorMembership: Membership = {
	...ownerMembership,
	id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	principalId: successorPrincipalId,
	role: "admin",
};

function createTransferDeps(
	seedMemberships: Membership[] = [ownerMembership, successorMembership],
) {
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
		published,
		deps: {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([
				ownerPrincipalId,
				successorPrincipalId,
			]),
		},
		agencyRepository,
		membershipRepository,
	};
}

describe("transferOwnership", () => {
	test("owner transfers agency to active successor without orphaning ownership", async () => {
		const { deps, agencyRepository, membershipRepository, published } =
			createTransferDeps();
		const commandId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		const result = await transferOwnership(deps, {
			commandId,
			agencyId,
			newOwnerPrincipalId: successorPrincipalId,
			actorPrincipalId: ownerPrincipalId,
		});
		expect(result.aggregateId).toBe(agencyId);
		expect(result.revision).toBe(2);
		const updatedAgency = await agencyRepository.findByAgencyId(agencyId);
		expect(updatedAgency?.ownerPrincipalId).toBe(successorPrincipalId);
		const formerOwner = await membershipRepository.findByAgencyAndPrincipal(
			agencyId,
			ownerPrincipalId,
		);
		const newOwner = await membershipRepository.findByAgencyAndPrincipal(
			agencyId,
			successorPrincipalId,
		);
		expect(formerOwner?.role).toBe("admin");
		expect(newOwner?.role).toBe("owner");
		expect(published).toHaveLength(1);
		expect(published[0]?.eventType).toBe(
			ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
		);
	});

	test("transfer rejects successor without active membership", async () => {
		const invitedSuccessor: Membership = {
			...successorMembership,
			status: "invited",
			principalId: null,
			inviteEmail: "successor@example.com",
		};
		const { deps } = createTransferDeps([ownerMembership, invitedSuccessor]);
		await expect(
			transferOwnership(deps, {
				commandId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				agencyId,
				newOwnerPrincipalId: successorPrincipalId,
				actorPrincipalId: ownerPrincipalId,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_OWNER_REQUIRED",
		} satisfies Partial<OrganizationCommandError>);
	});

	test("non-owner cannot transfer ownership", async () => {
		const { deps } = createTransferDeps();
		await expect(
			transferOwnership(deps, {
				commandId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				agencyId,
				newOwnerPrincipalId: successorPrincipalId,
				actorPrincipalId: outsiderPrincipalId,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_CROSS_TENANT",
		} satisfies Partial<OrganizationCommandError>);
	});

	test("commandId replay is idempotent", async () => {
		const { deps } = createTransferDeps();
		const commandId = "99999999-9999-4999-8999-999999999999";
		const first = await transferOwnership(deps, {
			commandId,
			agencyId,
			newOwnerPrincipalId: successorPrincipalId,
			actorPrincipalId: ownerPrincipalId,
		});
		const second = await transferOwnership(deps, {
			commandId,
			agencyId,
			newOwnerPrincipalId: successorPrincipalId,
			actorPrincipalId: ownerPrincipalId,
		});
		expect(second.idempotentReplay).toBe(true);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.revision).toBe(first.revision);
	});
});
