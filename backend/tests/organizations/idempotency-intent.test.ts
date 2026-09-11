import { describe, expect, test } from "bun:test";
import {
	acceptInviteByToken,
	activateMembership,
	advanceOnboarding,
	createAgency,
	inviteMember,
	revokeMembership,
	transferOwnership,
	updateAgencyMarkets,
} from "@anxionos/organizations";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import {
	createInMemoryAgencyRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryMembershipRepository,
	createInMemoryOwnerRepository,
	createRecordingOrganizationUnitOfWork,
	createStubPrincipalLookup,
	createTestInviteTokenHasher,
} from "./test-support";

/**
 * S2 (ANX-460) — idempotencia com intencao nos 8 comandos de organizations.
 *
 * Oraculos: (a) reuso da `Idempotency-Key` com payload divergente -> 409
 * `ORG_DUPLICATE_IDEMPOTENCY` e ZERO escrita; (b) repeticao com a mesma intencao
 * -> replay com o MESMO aggregateId; (c) replay apos mudanca de estado -> replay,
 * nao erro (o replay e' a primeira operacao, antes das validacoes de estado).
 */

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";
const SUCCESSOR = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const OWNER_MEMBERSHIP = "55555555-5555-4555-8555-555555555551";
const MEMBERSHIP_ID = "66666666-6666-4666-8666-666666666666";
const MEMBERSHIP_OTHER = "77777777-7777-4777-8777-777777777777";
const KEY = "88888888-8888-4888-8888-888888888888";
const OTHER_KEY = "99999999-9999-4999-8999-999999999999";

const NOW = new Date("2026-09-09T12:00:00.000Z");
const FUTURE = new Date("2030-01-01T00:00:00.000Z");

function buildAgency(
	id: string,
	ownerPrincipalId: string,
	overrides: Partial<Agency> = {},
): Agency {
	return {
		id,
		ownerPrincipalId,
		displayName: "Agency X",
		marketScope: "both",
		status: "draft",
		onboardingStep: "created",
		revision: 1,
		createdAt: NOW,
		updatedAt: NOW,
		...overrides,
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
		invitedAt: status === "invited" ? NOW : null,
		joinedAt: status === "active" ? NOW : null,
		revokedAt: status === "revoked" ? NOW : null,
		revision: 1,
		createdAt: NOW,
		updatedAt: NOW,
		...overrides,
	};
}

function createHarness(seed: {
	agencies?: Agency[];
	memberships?: Membership[];
	principals?: string[];
}) {
	const agencyRepository = createInMemoryAgencyRepository(seed.agencies ?? []);
	const membershipRepository = createInMemoryMembershipRepository(
		seed.memberships ?? [],
	);
	const ownerRepository = createInMemoryOwnerRepository();
	const commandJournal = createInMemoryCommandJournalRepository();
	const inviteTokenHasher = createTestInviteTokenHasher();
	const principalLookup = createStubPrincipalLookup(seed.principals ?? []);
	const { unitOfWork } = createRecordingOrganizationUnitOfWork({
		agencyRepository,
		ownerRepository,
		membershipRepository,
		commandJournal,
	});
	return {
		agencyRepository,
		membershipRepository,
		ownerRepository,
		commandJournal,
		inviteTokenHasher,
		principalLookup,
		unitOfWork,
		baseDeps: { unitOfWork, commandJournal },
	};
}

describe("organizations idempotency intent (S2/ANX-460)", () => {
	test("createAgency: divergent payload is 409 with zero writes", async () => {
		const harness = createHarness({ principals: [OWNER] });
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		await createAgency(deps, {
			commandId: KEY,
			displayName: "Agency One",
			marketScope: "both",
			ownerPrincipalId: OWNER,
		});
		await expect(
			createAgency(deps, {
				commandId: KEY,
				displayName: "Agency Two",
				marketScope: "both",
				ownerPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const agencies =
			await harness.agencyRepository.findByOwnerPrincipalId(OWNER);
		expect(agencies).toHaveLength(1);
		expect(agencies[0]?.displayName).toBe("Agency One");
	});

	test("createAgency: same intent replays the same aggregateId", async () => {
		const harness = createHarness({ principals: [OWNER] });
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		const input = {
			commandId: KEY,
			displayName: "Agency One",
			marketScope: "both" as const,
			ownerPrincipalId: OWNER,
		};
		const first = await createAgency(deps, input);
		const second = await createAgency(deps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("createAgency: concurrent same-key requests apply exactly once", async () => {
		const harness = createHarness({ principals: [OWNER] });
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		const input = {
			commandId: KEY,
			displayName: "Agency Once",
			marketScope: "both" as const,
			ownerPrincipalId: OWNER,
		};
		const [first, second] = await Promise.all([
			createAgency(deps, input),
			createAgency(deps, input),
		]);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(
			await harness.agencyRepository.findByOwnerPrincipalId(OWNER),
		).toHaveLength(1);
	});

	test("inviteMember: divergent payload is 409 with a single invite persisted", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		const deps = {
			...harness.baseDeps,
			inviteTokenHasher: harness.inviteTokenHasher,
		};
		await inviteMember(deps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			email: "first@example.com",
			role: "operator",
			actorPrincipalId: OWNER,
		});
		await expect(
			inviteMember(deps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				email: "second@example.com",
				role: "operator",
				actorPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const invited = (
			await harness.membershipRepository.listByAgency(AGENCY_ID)
		).filter((membership) => membership.status === "invited");
		expect(invited).toHaveLength(1);
		expect(invited[0]?.inviteEmail).toBe("first@example.com");
	});

	test("inviteMember: same intent replays the same aggregateId", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		const deps = {
			...harness.baseDeps,
			inviteTokenHasher: harness.inviteTokenHasher,
		};
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			email: "same@example.com",
			role: "operator" as const,
			actorPrincipalId: OWNER,
		};
		const first = await inviteMember(deps, input);
		const second = await inviteMember(deps, input);
		expect(second.result.aggregateId).toBe(first.result.aggregateId);
		expect(second.result.idempotentReplay).toBe(true);
		expect(second.inviteToken).toBe("");
	});

	test("activateMembership: divergent target is 409 and does not re-apply", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, null, "operator", "invited", {
					inviteEmail: "target@example.com",
					inviteExpiresAt: FUTURE,
				}),
			],
			principals: [OWNER, SUCCESSOR, OTHER],
		});
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		await activateMembership(deps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			membershipId: MEMBERSHIP_ID,
			actorPrincipalId: OWNER,
			targetPrincipalId: SUCCESSOR,
		});
		await expect(
			activateMembership(deps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				membershipId: MEMBERSHIP_ID,
				actorPrincipalId: OWNER,
				targetPrincipalId: OTHER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const membership = await harness.membershipRepository.findById(
			AGENCY_ID,
			MEMBERSHIP_ID,
		);
		expect(membership?.principalId).toBe(SUCCESSOR);
	});

	test("activateMembership: same intent replays the same aggregateId", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, null, "operator", "invited", {
					inviteEmail: "target@example.com",
					inviteExpiresAt: FUTURE,
				}),
			],
			principals: [OWNER, SUCCESSOR],
		});
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			membershipId: MEMBERSHIP_ID,
			actorPrincipalId: OWNER,
			targetPrincipalId: SUCCESSOR,
		};
		const first = await activateMembership(deps, input);
		const second = await activateMembership(deps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("advanceOnboarding: divergent step is 409 and the agency is unchanged", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		await advanceOnboarding(harness.baseDeps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			step: "markets_set",
			actorPrincipalId: OWNER,
		});
		await expect(
			advanceOnboarding(harness.baseDeps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				step: "blueprint_pending",
				actorPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const agency = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		expect(agency?.onboardingStep).toBe("markets_set");
	});

	test("advanceOnboarding: same intent replays the same aggregateId", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			step: "markets_set" as const,
			actorPrincipalId: OWNER,
		};
		const first = await advanceOnboarding(harness.baseDeps, input);
		const second = await advanceOnboarding(harness.baseDeps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("revokeMembership: divergent membership is 409 and the other stays active", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, SUCCESSOR, "admin", "active"),
				buildMembership(MEMBERSHIP_OTHER, AGENCY_ID, OTHER, "viewer", "active"),
			],
		});
		await revokeMembership(harness.baseDeps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			membershipId: MEMBERSHIP_ID,
			actorPrincipalId: OWNER,
		});
		await expect(
			revokeMembership(harness.baseDeps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				membershipId: MEMBERSHIP_OTHER,
				actorPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const other = await harness.membershipRepository.findById(
			AGENCY_ID,
			MEMBERSHIP_OTHER,
		);
		expect(other?.status).toBe("active");
	});

	test("revokeMembership: same intent replays the same aggregateId", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, SUCCESSOR, "admin", "active"),
			],
		});
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			membershipId: MEMBERSHIP_ID,
			actorPrincipalId: OWNER,
		};
		const first = await revokeMembership(harness.baseDeps, input);
		const second = await revokeMembership(harness.baseDeps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("transferOwnership: divergent successor is 409 and ownership is unchanged", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, SUCCESSOR, "admin", "active"),
				buildMembership(MEMBERSHIP_OTHER, AGENCY_ID, OTHER, "admin", "active"),
			],
			principals: [SUCCESSOR, OTHER],
		});
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		await transferOwnership(deps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			newOwnerPrincipalId: SUCCESSOR,
			actorPrincipalId: OWNER,
		});
		await expect(
			transferOwnership(deps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				newOwnerPrincipalId: OTHER,
				actorPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const agency = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		expect(agency?.ownerPrincipalId).toBe(SUCCESSOR);
	});

	test("transferOwnership: same intent replays the same aggregateId", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, SUCCESSOR, "admin", "active"),
			],
			principals: [SUCCESSOR],
		});
		const deps = {
			...harness.baseDeps,
			principalLookup: harness.principalLookup,
		};
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			newOwnerPrincipalId: SUCCESSOR,
			actorPrincipalId: OWNER,
		};
		const first = await transferOwnership(deps, input);
		const second = await transferOwnership(deps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("updateAgencyMarkets: divergent scope is 409 and the scope is unchanged", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		await updateAgencyMarkets(harness.baseDeps, {
			commandId: KEY,
			agencyId: AGENCY_ID,
			marketScope: "stocks",
			actorPrincipalId: OWNER,
		});
		await expect(
			updateAgencyMarkets(harness.baseDeps, {
				commandId: KEY,
				agencyId: AGENCY_ID,
				marketScope: "crypto",
				actorPrincipalId: OWNER,
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const agency = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		expect(agency?.marketScope).toBe("stocks");
	});

	test("updateAgencyMarkets: replay after a later state change is still replay", async () => {
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
			],
		});
		const input = {
			commandId: KEY,
			agencyId: AGENCY_ID,
			marketScope: "stocks" as const,
			actorPrincipalId: OWNER,
		};
		const first = await updateAgencyMarkets(harness.baseDeps, input);
		// Estado muda depois do comando original (outro comando/agente). O replay
		// legitimo NAO pode virar erro nem reaplicar.
		const current = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		if (!current) throw new Error("agency missing");
		await harness.agencyRepository.save({
			...current,
			marketScope: "crypto",
			revision: current.revision + 1,
		});
		const replay = await updateAgencyMarkets(harness.baseDeps, input);
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(replay.idempotentReplay).toBe(true);
		const after = await harness.agencyRepository.findByAgencyId(AGENCY_ID);
		expect(after?.marketScope).toBe("crypto");
	});

	test("acceptInviteByToken: divergent token is 409 and does not consume it", async () => {
		const tokenA = "invite-token-a";
		const tokenB = "invite-token-b";
		const hasher = createTestInviteTokenHasher();
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, null, "operator", "invited", {
					inviteEmail: "a@example.com",
					inviteTokenHash: hasher.hash(tokenA),
					inviteExpiresAt: FUTURE,
				}),
				buildMembership(
					MEMBERSHIP_OTHER,
					AGENCY_ID,
					null,
					"operator",
					"invited",
					{
						inviteEmail: "b@example.com",
						inviteTokenHash: hasher.hash(tokenB),
						inviteExpiresAt: FUTURE,
					},
				),
			],
		});
		const deps = {
			...harness.baseDeps,
			membershipRepository: harness.membershipRepository,
			inviteTokenHasher: hasher,
		};
		await acceptInviteByToken(deps, {
			commandId: KEY,
			token: tokenA,
			sessionPrincipalId: SUCCESSOR,
			sessionEmail: "a@example.com",
		});
		await expect(
			acceptInviteByToken(deps, {
				commandId: KEY,
				token: tokenB,
				sessionPrincipalId: OTHER,
				sessionEmail: "b@example.com",
			}),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
		const second = await harness.membershipRepository.findById(
			AGENCY_ID,
			MEMBERSHIP_OTHER,
		);
		expect(second?.status).toBe("invited");
		expect(second?.principalId).toBeNull();
	});

	test("acceptInviteByToken: same intent replays the same aggregateId", async () => {
		const token = "invite-token-same";
		const hasher = createTestInviteTokenHasher();
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, null, "operator", "invited", {
					inviteEmail: "same@example.com",
					inviteTokenHash: hasher.hash(token),
					inviteExpiresAt: FUTURE,
				}),
			],
		});
		const deps = {
			...harness.baseDeps,
			membershipRepository: harness.membershipRepository,
			inviteTokenHasher: hasher,
		};
		const input = {
			commandId: KEY,
			token,
			sessionPrincipalId: SUCCESSOR,
			sessionEmail: "same@example.com",
		};
		const first = await acceptInviteByToken(deps, input);
		const second = await acceptInviteByToken(deps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("acceptInviteByToken: replay after the membership is revoked is still replay", async () => {
		const token = "invite-token-revoked";
		const hasher = createTestInviteTokenHasher();
		const harness = createHarness({
			agencies: [buildAgency(AGENCY_ID, OWNER)],
			memberships: [
				buildMembership(OWNER_MEMBERSHIP, AGENCY_ID, OWNER, "owner", "active"),
				buildMembership(MEMBERSHIP_ID, AGENCY_ID, null, "operator", "invited", {
					inviteEmail: "revoked@example.com",
					inviteTokenHash: hasher.hash(token),
					inviteExpiresAt: FUTURE,
				}),
			],
		});
		const deps = {
			...harness.baseDeps,
			membershipRepository: harness.membershipRepository,
			inviteTokenHasher: hasher,
		};
		const input = {
			commandId: KEY,
			token,
			sessionPrincipalId: SUCCESSOR,
			sessionEmail: "revoked@example.com",
		};
		const first = await acceptInviteByToken(deps, input);
		await revokeMembership(harness.baseDeps, {
			commandId: OTHER_KEY,
			agencyId: AGENCY_ID,
			membershipId: MEMBERSHIP_ID,
			actorPrincipalId: OWNER,
		});
		// O token ja' foi consumido (hash nulo) e a membership esta' revoked; o
		// replay da MESMA key/intencao precisa continuar sendo replay.
		const replay = await acceptInviteByToken(deps, input);
		expect(replay.aggregateId).toBe(first.aggregateId);
		expect(replay.idempotentReplay).toBe(true);
	});

	test("reusing a key across commands is 409", async () => {
		const harness = createHarness({ principals: [OWNER] });
		await createAgency(
			{ ...harness.baseDeps, principalLookup: harness.principalLookup },
			{
				commandId: KEY,
				displayName: "Agency One",
				marketScope: "both",
				ownerPrincipalId: OWNER,
			},
		);
		await expect(
			inviteMember(
				{ ...harness.baseDeps, inviteTokenHasher: harness.inviteTokenHasher },
				{
					commandId: KEY,
					agencyId: AGENCY_ID,
					email: "cross@example.com",
					role: "operator",
					actorPrincipalId: OWNER,
				},
			),
		).rejects.toMatchObject({
			organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
			statusCode: 409,
		});
	});
});
