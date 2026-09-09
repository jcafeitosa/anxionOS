import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
import type { OwnerRepository } from "../../modules/organizations/src/domain/ports/owner-repository";
import type {
	OrganizationTransactionContext,
	OrganizationUnitOfWork,
} from "../../modules/organizations/src/domain/ports/organization-unit-of-work";
import { createHmacInviteTokenHasher } from "../../modules/organizations/src/infrastructure/adapters/hmac-invite-token-hasher";

export const TEST_INVITE_PEPPER = "organizations-test-invite-pepper";

export function createTestInviteTokenHasher() {
	return createHmacInviteTokenHasher(TEST_INVITE_PEPPER);
}

export function createInMemoryAgencyRepository(seed: Agency[] = []): AgencyRepository {
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
			return [...agencies.values()].filter((agency) => agency.ownerPrincipalId === ownerPrincipalId);
		},
	};
}

export function createInMemoryOwnerRepository(seed: Owner[] = []): OwnerRepository {
	const owners = new Map(seed.map((owner) => [owner.principalId, { ...owner }]));
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

export function createInMemoryMembershipRepository(seed: Membership[] = []): MembershipRepository {
	const memberships = new Map(seed.map((membership) => [membershipKey(membership), { ...membership }]));
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
				if (membership.agencyId === agencyId && membership.principalId === principalId) {
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
				if (membership.status === "invited" && membership.inviteTokenHash === tokenHash) {
					return membership;
				}
			}
			return null;
		},
		async listByAgency(agencyId) {
			return [...memberships.values()].filter((membership) => membership.agencyId === agencyId);
		},
		async listActiveByPrincipal(principalId) {
			return [...memberships.values()].filter(
				(membership) => membership.principalId === principalId && membership.status === "active",
			);
		},
	};
}

export function createInMemoryCommandJournalRepository(
	seed: CommandJournalRecord[] = [],
): CommandJournalRepository {
	const records = new Map(seed.map((record) => [record.commandId, { ...record }]));
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
		async runInTransaction(work) {
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

function membershipKey(membership: Pick<Membership, "agencyId" | "id">): string {
	return `${membership.agencyId}:${membership.id}`;
}
