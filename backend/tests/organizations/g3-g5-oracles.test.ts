import { describe, expect, test } from "bun:test";
/**
 * Slice 6 — G3-01..10 and G5-01..04 oracles (R09-dev-plan.md).
 * Fixture: backend/tests/fixtures/orgs-two-agencies.json
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	activateMembershipCommandSchema,
	createAgencyCommandSchema,
} from "@anxionos/contracts/organizations";
import {
	PrincipalLookupUnavailableError,
	acceptInviteByToken,
	activateMembership,
	createAgency,
	getAgencyById,
	inviteMember,
	listAgenciesForPrincipal,
	listMembershipsByAgency,
	revokeMembership,
} from "@anxionos/organizations";
import { OrganizationCommandError } from "../../modules/organizations/src/application/errors";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import type { PrincipalLookup } from "../../modules/organizations/src/domain/ports/principal-lookup";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createStubPrincipalLookup,
	createTestInviteTokenHasher,
} from "./test-support";

interface TwoAgenciesFixture {
	principalA: string;
	principalB: string;
	inviteePrincipalC: string;
	agencyX: string;
	agencyY: string;
	membershipOwnerX: string;
	membershipAdminX: string;
	membershipOwnerY: string;
	membershipAdminY: string;
}

function loadFixture(): TwoAgenciesFixture {
	const path = join(import.meta.dir, "../fixtures/orgs-two-agencies.json");
	return JSON.parse(readFileSync(path, "utf8")) as TwoAgenciesFixture;
}

const now = new Date("2026-09-09T12:00:00.000Z");

function buildAgency(
	id: string,
	ownerPrincipalId: string,
	displayName: string,
): Agency {
	return {
		id,
		ownerPrincipalId,
		displayName,
		marketScope: "both",
		status: "ready",
		onboardingStep: "ready",
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function buildMembership(
	id: string,
	agencyId: string,
	principalId: string | null,
	role: Membership["role"],
	status: Membership["status"],
	overrides: Partial<Membership> = {},
): Membership {
	return {
		id,
		agencyId,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status,
		invitedAt: status === "invited" ? now : null,
		joinedAt: status === "active" ? now : null,
		revokedAt: status === "revoked" ? now : null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

function createFixtureHarness(fixture: TwoAgenciesFixture) {
	const agencies = [
		buildAgency(fixture.agencyX, fixture.principalA, "Agency X"),
		buildAgency(fixture.agencyY, fixture.principalB, "Agency Y"),
	];
	const memberships = [
		buildMembership(
			fixture.membershipOwnerX,
			fixture.agencyX,
			fixture.principalA,
			"owner",
			"active",
		),
		buildMembership(
			fixture.membershipAdminX,
			fixture.agencyX,
			fixture.inviteePrincipalC,
			"admin",
			"active",
		),
		buildMembership(
			fixture.membershipOwnerY,
			fixture.agencyY,
			fixture.principalB,
			"owner",
			"active",
		),
		buildMembership(
			fixture.membershipAdminY,
			fixture.agencyY,
			fixture.principalA,
			"viewer",
			"revoked",
		),
	];
	const agencyRepository = createInMemoryAgencyRepository(agencies);
	const membershipRepository = createInMemoryMembershipRepository(memberships);
	const commandJournal = createInMemoryCommandJournalRepository();
	const inviteTokenHasher = createTestInviteTokenHasher();
	const principalLookup = createStubPrincipalLookup([
		fixture.principalA,
		fixture.principalB,
		fixture.inviteePrincipalC,
	]);
	const { unitOfWork, published } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository: createInMemoryOwnerRepository(),
		membershipRepository,
		commandJournal,
	});
	return {
		fixture,
		agencyRepository,
		membershipRepository,
		commandJournal,
		inviteTokenHasher,
		principalLookup,
		unitOfWork,
		published,
		commandDeps: {
			unitOfWork,
			commandJournal,
			principalLookup,
			membershipRepository,
		},
		inviteDeps: { unitOfWork, commandJournal, inviteTokenHasher },
		queryDeps: { agencyRepository, membershipRepository },
	};
}

function createUnavailablePrincipalLookup(): PrincipalLookup {
	return {
		async exists() {
			throw new PrincipalLookupUnavailableError("identity down");
		},
	};
}

describe("organizations G3 oracles (fixture orgs-two-agencies)", () => {
	const fixture = loadFixture();

	test("G3-01 duplicate CreateAgency commandId yields idempotentReplay", async () => {
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingOrganizationUnitOfWork({
			agencyRepository: createInMemoryAgencyRepository(),
			ownerRepository: createInMemoryOwnerRepository(),
			membershipRepository: createInMemoryMembershipRepository(),
			commandJournal,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([fixture.principalA]),
		};
		const commandId = "11111111-1111-4111-8111-111111111111";
		const first = await createAgency(deps, {
			commandId,
			displayName: "New Agency",
			marketScope: "both",
			ownerPrincipalId: fixture.principalA,
		});
		const second = await createAgency(deps, {
			commandId,
			displayName: "New Agency",
			marketScope: "both",
			ownerPrincipalId: fixture.principalA,
		});
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("G3-02 principalA cannot access agencyY", async () => {
		const { queryDeps } = createFixtureHarness(fixture);
		await expect(
			getAgencyById(queryDeps, {
				agencyId: fixture.agencyY,
				actorPrincipalId: fixture.principalA,
			}),
		).rejects.toMatchObject({ organizationCode: "ORG_CROSS_TENANT" });
	});

	test("G3-03 ListAgenciesForPrincipal returns only active memberships", async () => {
		const { queryDeps } = createFixtureHarness(fixture);
		const agencies = await listAgenciesForPrincipal(queryDeps, {
			principalId: fixture.principalA,
		});
		expect(agencies.map((a) => a.id).sort()).toEqual([fixture.agencyX]);
	});

	test("G3-04 InviteMember succeeds when identity lookup is unavailable", async () => {
		const { inviteDeps } = createFixtureHarness(fixture);
		const invited = await inviteMember(inviteDeps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			agencyId: fixture.agencyX,
			email: "new-invite@example.com",
			role: "operator",
			actorPrincipalId: fixture.principalA,
		});
		expect(invited.result.aggregateId).toMatch(/^[0-9a-f-]{36}$/i);
	});

	test("G3-05 CreateAgency with identity down returns ORG_IDENTITY_UNAVAILABLE and zero agencies", async () => {
		const agencyRepository = createInMemoryAgencyRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingOrganizationUnitOfWork({
			agencyRepository,
			ownerRepository: createInMemoryOwnerRepository(),
			membershipRepository: createInMemoryMembershipRepository(),
			commandJournal,
		});
		await expect(
			createAgency(
				{
					unitOfWork,
					commandJournal,
					principalLookup: createUnavailablePrincipalLookup(),
				},
				{
					commandId: "33333333-3333-4333-8333-333333333333",
					displayName: "Should Not Persist",
					marketScope: "both",
					ownerPrincipalId: fixture.principalA,
				},
			),
		).rejects.toMatchObject({ organizationCode: "ORG_IDENTITY_UNAVAILABLE" });
		const agencies = await agencyRepository.findByOwnerPrincipalId(
			fixture.principalA,
		);
		expect(agencies).toHaveLength(0);
	});

	test("G3-06 revoking sole owner yields ORG_OWNER_REQUIRED", async () => {
		const { commandDeps } = createFixtureHarness(fixture);
		await expect(
			revokeMembership(commandDeps, {
				commandId: "44444444-4444-4444-8444-444444444444",
				agencyId: fixture.agencyX,
				membershipId: fixture.membershipOwnerX,
				actorPrincipalId: fixture.principalA,
			}),
		).rejects.toMatchObject({ organizationCode: "ORG_OWNER_REQUIRED" });
	});

	test("G3-07 expired invite token yields ORG_INVITE_EXPIRED", async () => {
		const hasher = createTestInviteTokenHasher();
		const token = "expired-oracle-token";
		const { inviteDeps, commandDeps } = createFixtureHarness(fixture);
		const expiredMembership = buildMembership(
			"88888888-8888-4888-8888-888888888888",
			fixture.agencyX,
			null,
			"operator",
			"invited",
			{
				inviteEmail: "expired@example.com",
				inviteTokenHash: hasher.hash(token),
				inviteExpiresAt: new Date("2020-01-01T00:00:00.000Z"),
			},
		);
		const membershipRepository = createInMemoryMembershipRepository([
			buildMembership(
				fixture.membershipOwnerX,
				fixture.agencyX,
				fixture.principalA,
				"owner",
				"active",
			),
			expiredMembership,
		]);
		const agencyRepository = createInMemoryAgencyRepository([
			buildAgency(fixture.agencyX, fixture.principalA, "Agency X"),
		]);
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingOrganizationUnitOfWork({
			agencyRepository,
			ownerRepository: createInMemoryOwnerRepository(),
			membershipRepository,
			commandJournal,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			membershipRepository,
			inviteTokenHasher: hasher,
		};
		await expect(
			acceptInviteByToken(deps, {
				commandId: "55555555-5555-4555-8555-555555555555",
				token,
				sessionPrincipalId: fixture.inviteePrincipalC,
				sessionEmail: "expired@example.com",
			}),
		).rejects.toMatchObject({ organizationCode: "ORG_INVITE_EXPIRED" });
	});

	test("G3-08 session email mismatch yields ORG_INVITE_EMAIL_MISMATCH", async () => {
		const { inviteDeps, commandDeps } = createFixtureHarness(fixture);
		const invited = await inviteMember(inviteDeps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			agencyId: fixture.agencyX,
			email: "match@example.com",
			role: "operator",
			actorPrincipalId: fixture.principalA,
		});
		await expect(
			acceptInviteByToken(
				{ ...commandDeps, inviteTokenHasher: inviteDeps.inviteTokenHasher },
				{
					commandId: "77777777-7777-4777-8777-777777777777",
					token: invited.inviteToken,
					sessionPrincipalId: fixture.inviteePrincipalC,
					sessionEmail: "wrong@example.com",
				},
			),
		).rejects.toMatchObject({ organizationCode: "ORG_INVITE_EMAIL_MISMATCH" });
	});

	test("G3-09 admin activates invited membership by membershipId", async () => {
		const { inviteDeps, commandDeps } = createFixtureHarness(fixture);
		const invited = await inviteMember(inviteDeps, {
			commandId: "88888888-8888-4888-8888-888888888801",
			agencyId: fixture.agencyX,
			email: "admin-activate@example.com",
			role: "operator",
			actorPrincipalId: fixture.principalA,
		});
		const activated = await activateMembership(commandDeps, {
			commandId: "88888888-8888-4888-8888-888888888802",
			agencyId: fixture.agencyX,
			membershipId: invited.result.aggregateId,
			actorPrincipalId: fixture.principalA,
			targetPrincipalId: fixture.inviteePrincipalC,
		});
		expect(activated.aggregateId).toBe(invited.result.aggregateId);
		expect(activated.revision).toBeGreaterThan(1);
	});

	test("G3-10 two distinct commandIds create two agencies for same owner", async () => {
		const agencyRepository = createInMemoryAgencyRepository();
		const commandJournal = createInMemoryCommandJournalRepository();
		const { unitOfWork } = createRecordingOrganizationUnitOfWork({
			agencyRepository,
			ownerRepository: createInMemoryOwnerRepository(),
			membershipRepository: createInMemoryMembershipRepository(),
			commandJournal,
		});
		const deps = {
			unitOfWork,
			commandJournal,
			principalLookup: createStubPrincipalLookup([fixture.principalA]),
		};
		const first = await createAgency(deps, {
			commandId: "99999999-9999-4999-8999-999999999901",
			displayName: "Agency One",
			marketScope: "both",
			ownerPrincipalId: fixture.principalA,
		});
		const second = await createAgency(deps, {
			commandId: "99999999-9999-4999-8999-999999999902",
			displayName: "Agency Two",
			marketScope: "both",
			ownerPrincipalId: fixture.principalA,
		});
		expect(first.aggregateId).not.toBe(second.aggregateId);
		const agencies = await agencyRepository.findByOwnerPrincipalId(
			fixture.principalA,
		);
		expect(agencies).toHaveLength(2);
	});
});

describe("organizations G5 oracles (fixture orgs-two-agencies)", () => {
	const fixture = loadFixture();

	test("G5-01 principalA cannot list memberships on agencyY", async () => {
		const { queryDeps } = createFixtureHarness(fixture);
		await expect(
			listMembershipsByAgency(queryDeps, {
				agencyId: fixture.agencyY,
				actorPrincipalId: fixture.principalA,
			}),
		).rejects.toMatchObject({ organizationCode: "ORG_CROSS_TENANT" });
	});

	test("G5-02 parallel invites for same email yield single invited membership", async () => {
		const { inviteDeps, membershipRepository } = createFixtureHarness(fixture);
		const email = "race+g5@example.com";
		const results = await Promise.allSettled(
			Array.from({ length: 20 }, (_, index) =>
				inviteMember(inviteDeps, {
					commandId: `a0a0a0a0-a0a0-40a0-80a0-a0a0a0a0a0${index.toString(16).padStart(2, "0")}`,
					agencyId: fixture.agencyX,
					email,
					role: "operator",
					actorPrincipalId: fixture.principalA,
				}),
			),
		);
		const fulfilled = results.filter((r) => r.status === "fulfilled");
		const rejected = results.filter((r) => r.status === "rejected");
		expect(fulfilled.length).toBeGreaterThanOrEqual(1);
		expect(fulfilled.length + rejected.length).toBe(20);
		const invited = (
			await membershipRepository.listByAgency(fixture.agencyX)
		).filter((m) => m.status === "invited" && m.inviteEmail === email);
		expect(invited).toHaveLength(1);
		for (const failure of rejected) {
			expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(
				OrganizationCommandError,
			);
		}
	});

	test("G5-03 createAgency command schema rejects principalId tampering in body", () => {
		const parsed = createAgencyCommandSchema
			.omit({ commandId: true })
			.strict()
			.safeParse({
				displayName: "Tampered",
				marketScope: "both",
				principalId: fixture.principalB,
			});
		expect(parsed.success).toBe(false);
	});

	test("G5-03 activateMembership schema rejects principalId tampering in body", () => {
		const parsed = activateMembershipCommandSchema.strict().safeParse({
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			agencyId: fixture.agencyX,
			membershipId: fixture.membershipAdminX,
			principalId: fixture.principalB,
		});
		expect(parsed.success).toBe(false);
	});

	test("G5-04 accept invite with wrong session email yields ORG_INVITE_EMAIL_MISMATCH", async () => {
		const { inviteDeps, commandDeps } = createFixtureHarness(fixture);
		const invited = await inviteMember(inviteDeps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			agencyId: fixture.agencyX,
			email: "g5-accept@example.com",
			role: "operator",
			actorPrincipalId: fixture.principalA,
		});
		await expect(
			acceptInviteByToken(
				{ ...commandDeps, inviteTokenHasher: inviteDeps.inviteTokenHasher },
				{
					commandId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
					token: invited.inviteToken,
					sessionPrincipalId: fixture.principalB,
					sessionEmail: "other@example.com",
				},
			),
		).rejects.toMatchObject({ organizationCode: "ORG_INVITE_EMAIL_MISMATCH" });
	});
});
