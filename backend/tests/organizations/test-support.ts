import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import type { Agency } from "../../modules/organizations/src/domain/entities/agency";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import type { Owner } from "../../modules/organizations/src/domain/entities/owner";
import { MembershipRevisionConflictError } from "../../modules/organizations/src/domain/errors/membership-errors";
import type { AgencyRepository } from "../../modules/organizations/src/domain/ports/agency-repository";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../modules/organizations/src/domain/ports/command-journal";
import type { MembershipRepository } from "../../modules/organizations/src/domain/ports/membership-repository";
import type {
	OrganizationTransactionContext,
	OrganizationUnitOfWork,
} from "../../modules/organizations/src/domain/ports/organization-unit-of-work";
import type { OwnerRepository } from "../../modules/organizations/src/domain/ports/owner-repository";
import type { PrincipalLookup } from "../../modules/organizations/src/domain/ports/principal-lookup";
import { createHmacInviteTokenHasher } from "../../modules/organizations/src/infrastructure/adapters/hmac-invite-token-hasher";
import { ensureOrganizationsSchema } from "../../modules/organizations/src/infrastructure/migrate";

export const TEST_INVITE_PEPPER = "organizations-test-invite-pepper";

export function createTestInviteTokenHasher() {
	return createHmacInviteTokenHasher(TEST_INVITE_PEPPER);
}

export function createInMemoryAgencyRepository(
	seed: Agency[] = [],
): AgencyRepository {
	const agencies = new Map(seed.map((agency) => [agency.id, { ...agency }]));
	return {
		async save(agency) {
			agencies.set(agency.id, { ...agency });
			return { ...agency };
		},
		async findByAgencyId(agencyId) {
			return agencies.get(agencyId) ?? null;
		},
		async findByOwnerPrincipalId(ownerPrincipalId) {
			return [...agencies.values()].filter(
				(agency) => agency.ownerPrincipalId === ownerPrincipalId,
			);
		},
	};
}

export function createInMemoryOwnerRepository(
	seed: Owner[] = [],
): OwnerRepository {
	const owners = new Map(
		seed.map((owner) => [owner.principalId, { ...owner }]),
	);
	return {
		async save(owner) {
			owners.set(owner.principalId, { ...owner });
			return { ...owner };
		},
		async findByPrincipalId(principalId) {
			return owners.get(principalId) ?? null;
		},
	};
}

export function createInMemoryMembershipRepository(
	seed: Membership[] = [],
): MembershipRepository {
	const memberships = new Map(
		seed.map((membership) => [membershipKey(membership), { ...membership }]),
	);
	return {
		async save(membership) {
			const key = membershipKey(membership);
			const existing = memberships.get(key);
			if (existing) {
				const expectedRevision = membership.revision - 1;
				if (existing.revision !== expectedRevision) {
					throw new MembershipRevisionConflictError();
				}
			}
			const stored = { ...membership };
			memberships.set(key, stored);
			return { ...stored };
		},
		async findById(agencyId, membershipId) {
			return memberships.get(`${agencyId}:${membershipId}`) ?? null;
		},
		async findByAgencyAndPrincipal(agencyId, principalId) {
			for (const membership of memberships.values()) {
				if (
					membership.agencyId === agencyId &&
					membership.principalId === principalId
				) {
					return membership;
				}
			}
			return null;
		},
		async findInvitedByAgencyAndEmail(agencyId, email) {
			const normalized = email.toLowerCase();
			for (const membership of memberships.values()) {
				if (
					membership.agencyId === agencyId &&
					membership.status === "invited" &&
					membership.inviteEmail?.toLowerCase() === normalized
				) {
					return membership;
				}
			}
			return null;
		},
		async findInvitedByTokenHash(tokenHash) {
			for (const membership of memberships.values()) {
				if (
					membership.status === "invited" &&
					membership.inviteTokenHash === tokenHash
				) {
					return membership;
				}
			}
			return null;
		},
		async listByAgency(agencyId) {
			return [...memberships.values()].filter(
				(membership) => membership.agencyId === agencyId,
			);
		},
		async listActiveByPrincipal(principalId) {
			return [...memberships.values()].filter(
				(membership) =>
					membership.principalId === principalId &&
					membership.status === "active",
			);
		},
		async listInvitedForActor({ principalId, email }) {
			const normalized = email.toLowerCase();
			return [...memberships.values()].filter(
				(membership) =>
					membership.status === "invited" &&
					(membership.principalId === principalId ||
						membership.inviteEmail?.toLowerCase() === normalized),
			);
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(
		seed.map((record) => [record.commandId, { ...record }]),
	);
	return {
		async findByCommandId(commandId) {
			return records.get(commandId) ?? null;
		},
		async record(entry: NewCommandJournalRecord) {
			const existing = records.get(entry.commandId);
			if (existing) {
				return existing;
			}
			const stored: CommandJournalRecord = {
				...entry,
				createdAt: new Date(),
			};
			records.set(entry.commandId, stored);
			return stored;
		},
	};
}

export function createRecordingOrganizationUnitOfWork(deps: {
	agencyRepository: AgencyRepository;
	ownerRepository: OwnerRepository;
	membershipRepository: MembershipRepository;
	commandJournal: CommandJournalRepository;
}): { unitOfWork: OrganizationUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: OrganizationUnitOfWork = {
		async runInTransaction(_ctx, work) {
			const run = transactionChain.then(async () => {
				const context: OrganizationTransactionContext = {
					client: null,
					agencyRepository: deps.agencyRepository,
					ownerRepository: deps.ownerRepository,
					membershipRepository: deps.membershipRepository,
					commandJournal: deps.commandJournal,
					async publishEvents(envelopes) {
						published.push(...envelopes);
					},
				};
				return work(context);
			});
			transactionChain = run.catch(() => undefined);
			return run;
		},
	};
	return { unitOfWork, published };
}

function membershipKey(
	membership: Pick<Membership, "agencyId" | "id">,
): string {
	return `${membership.agencyId}:${membership.id}`;
}

export function createStubPrincipalLookup(
	existingPrincipalIds: string[] = [],
): PrincipalLookup {
	const existing = new Set(existingPrincipalIds);
	return {
		async exists(principalId) {
			return existing.has(principalId);
		},
	};
}

export function getDatabaseUrl(): string | undefined {
	return process.env.DATABASE_URL?.trim() || undefined;
}

export function shouldRunPgIntegrationTests(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" && Boolean(getDatabaseUrl())
	);
}

const ORGANIZATIONS_TRUNCATE_SQL =
	"TRUNCATE organizations_command_journal, organizations_memberships, organizations_owners, organizations_agencies, domain_journal, outbox RESTART IDENTITY CASCADE";

export async function withOrganizationsPgHarness<T>(
	work: (ctx: { pool: ReturnType<typeof createPgPool> }) => Promise<T>,
): Promise<T | undefined> {
	const url = getDatabaseUrl();
	if (!shouldRunPgIntegrationTests() || !url) {
		return undefined;
	}

	const pool = createPgPool(url);
	try {
		await ensureEventingSchema(pool);
		await ensureOrganizationsSchema(pool);
		await pool.query(ORGANIZATIONS_TRUNCATE_SQL);
		return await work({ pool });
	} finally {
		await pool.end();
	}
}

export function createTwoDistinctAgencies(
	context?: {
		agencyA?: Agency;
		agencyB?: Agency;
	},
): {
	agencyIdA: string;
	agencyIdB: string;
	agencyA: Agency;
	agencyB: Agency;
	agencyRepositoryA: AgencyRepository;
	agencyRepositoryB: AgencyRepository;
} {
	// Generate two distinct agency IDs
	const agencyIdA = randomUUID();
	const agencyIdB = randomUUID();

	// Create agencies with distinct IDs
	const agencyA: Agency = {
		id: agencyIdA,
		ownerPrincipalId: randomUUID(),
		displayName: context?.agencyA?.displayName ?? `Agency A ${agencyIdA.slice(0, 8)}`,
		marketScope: context?.agencyA?.marketScope ?? "both",
		status: context?.agencyA?.status ?? "draft",
		onboardingStep: context?.agencyA?.onboardingStep ?? "created",
		revision: context?.agencyA?.revision ?? 1,
		createdAt: context?.agencyA?.createdAt ?? new Date(),
		updatedAt: context?.agencyA?.updatedAt ?? new Date(),
	};

	const agencyB: Agency = {
		id: agencyIdB,
		ownerPrincipalId: randomUUID(),
		displayName: context?.agencyB?.displayName ?? `Agency B ${agencyIdB.slice(0, 8)}`,
		marketScope: context?.agencyB?.marketScope ?? "both",
		status: context?.agencyB?.status ?? "draft",
		onboardingStep: context?.agencyB?.onboardingStep ?? "created",
		revision: context?.agencyB?.revision ?? 1,
		createdAt: context?.agencyB?.createdAt ?? new Date(),
		updatedAt: context?.agencyB?.updatedAt ?? new Date(),
	};

	const agencyRepositoryA = createInMemoryAgencyRepository([agencyA]);
	const agencyRepositoryB = createInMemoryAgencyRepository([agencyB]);

	return {
		agencyIdA,
		agencyIdB,
		agencyA,
		agencyB,
		agencyRepositoryA,
		agencyRepositoryB,
	};
}

export async function assertAgencyIsolation(
	agencyA: Agency,
	agencyB: Agency,
	agencyRepositoryA: AgencyRepository,
	agencyRepositoryB: AgencyRepository,
): {
	agencyAIsolated: boolean;
	agencyBIsolated: boolean;
	details: string[];
} {
	const details: string[] = [];

	// Get agencies visible to each principal in their respective repositories
	const agenciesForA = await agencyRepositoryA.findByOwnerPrincipalId(agencyA.ownerPrincipalId);
	const agenciesForB = await agencyRepositoryB.findByOwnerPrincipalId(agencyB.ownerPrincipalId);

	// Check A only sees its own agencies (should only see agencyA in repoA)
	const aOnlyOwnsA = agenciesForA.length === 1 && agenciesForA[0].id === agencyA.id;
	if (aOnlyOwnsA) {
		details.push("PASS: Agency A only sees its own agency");
	} else {
		details.push(
			`FAIL: Agency A sees ${agenciesForA.length} agencies in its repo (expected 1)`,
		);
	}

	// Check B only sees its own agencies (should only see agencyB in repoB)
	const bOnlyOwnsB = agenciesForB.length === 1 && agenciesForB[0].id === agencyB.id;
	if (bOnlyOwnsB) {
		details.push("PASS: Agency B only sees its own agency");
	} else {
		details.push(
			`FAIL: Agency B sees ${agenciesForB.length} agencies in its repo (expected 1)`,
		);
	}

	const agencyAIsolated = aOnlyOwnsA;
	const agencyBIsolated = bOnlyOwnsB;

	return {
		agencyAIsolated,
		agencyBIsolated,
		details,
	};
}