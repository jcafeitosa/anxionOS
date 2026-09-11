import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { NewPrincipal, Principal } from "@anxionos/identity";
import type {
	NewServiceCredential,
	ServiceCredential,
} from "../../modules/identity/src/domain/entities/service-credential";
import type {
	NewServiceIdentity,
	ServiceIdentity,
} from "../../modules/identity/src/domain/entities/service-identity";
import type {
	NewSessionRef,
	SessionRef,
} from "../../modules/identity/src/domain/entities/session-ref";
import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../../modules/identity/src/domain/ports/command-journal";
import type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "../../modules/identity/src/domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../modules/identity/src/domain/ports/principal-repository";
import type { ServiceCredentialRepository } from "../../modules/identity/src/domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../../modules/identity/src/domain/ports/service-identity-repository";
import type { SessionRefRepository } from "../../modules/identity/src/domain/ports/session-ref-repository";

export function createInMemoryPrincipalRepository(
	seed: Principal[] = [],
): PrincipalRepository {
	const principals = new Map(seed.map((p) => [p.id, { ...p }]));

	function bump(principal: Principal): Principal {
		return { ...principal, revision: principal.revision + 1 };
	}

	function matches(principal: Principal, expectedRevision?: number): boolean {
		return (
			expectedRevision === undefined || principal.revision === expectedRevision
		);
	}

	return {
		async findById(id) {
			return principals.get(id) ?? null;
		},
		async findByAuthUserId(authUserId) {
			for (const principal of principals.values()) {
				if (principal.authUserId === authUserId) {
					return principal;
				}
			}
			return null;
		},
		async findByEmail(email) {
			for (const principal of principals.values()) {
				if (principal.email === email) {
					return principal;
				}
			}
			return null;
		},
		async listSuspended() {
			return [...principals.values()].filter(
				(principal) => principal.status === "suspended",
			);
		},
		async listAll() {
			return [...principals.values()];
		},
		async create(input: NewPrincipal) {
			const principal: Principal = {
				id: crypto.randomUUID(),
				authUserId: input.authUserId ?? null,
				email: input.email,
				kind: input.kind ?? "human",
				status: "active",
				revision: 1,
				createdAt: new Date(),
				suspendedAt: null,
				suspensionReason: null,
				revokedAt: null,
				revocationReason: null,
			};
			principals.set(principal.id, principal);
			return principal;
		},
		async markSuspended(id, reasonCode, suspendedAt, expectedRevision) {
			const principal = principals.get(id);
			if (
				!principal ||
				principal.status !== "active" ||
				!matches(principal, expectedRevision)
			) {
				return null;
			}
			const updated = bump({
				...principal,
				status: "suspended" as const,
				suspendedAt,
				suspensionReason: reasonCode,
			});
			principals.set(id, updated);
			return updated;
		},
		async reactivate(id, expectedRevision) {
			const principal = principals.get(id);
			if (
				!principal ||
				principal.status !== "suspended" ||
				!matches(principal, expectedRevision)
			) {
				return null;
			}
			const updated = bump({
				...principal,
				status: "active" as const,
				suspendedAt: null,
				suspensionReason: null,
			});
			principals.set(id, updated);
			return updated;
		},
		async revoke(id, reasonCode, revokedAt, expectedRevision) {
			const principal = principals.get(id);
			if (
				!principal ||
				principal.status === "revoked" ||
				!matches(principal, expectedRevision)
			) {
				return null;
			}
			const updated = bump({
				...principal,
				status: "revoked" as const,
				revokedAt,
				revocationReason: reasonCode,
			});
			principals.set(id, updated);
			return updated;
		},
		async updateEmail(id, email) {
			const principal = principals.get(id);
			if (!principal) {
				return null;
			}
			const updated = bump({ ...principal, email });
			principals.set(id, updated);
			return updated;
		},
		async linkAuthUserId(id, authUserId) {
			const principal = principals.get(id);
			if (!principal) {
				return null;
			}
			const updated = bump({ ...principal, authUserId });
			principals.set(id, updated);
			return updated;
		},
	};
}

export function createInMemoryServiceIdentityRepository(
	seed: ServiceIdentity[] = [],
): ServiceIdentityRepository {
	const identities = new Map(seed.map((item) => [item.id, { ...item }]));
	return {
		async findById(id) {
			return identities.get(id) ?? null;
		},
		async findActiveByPrincipalId(principalId) {
			return [...identities.values()].filter(
				(item) => item.principalId === principalId && item.status === "active",
			);
		},
		async create(input: NewServiceIdentity) {
			const identity: ServiceIdentity = {
				id: crypto.randomUUID(),
				principalId: input.principalId,
				label: input.label,
				status: "active",
				createdAt: new Date(),
				revokedAt: null,
			};
			identities.set(identity.id, identity);
			return identity;
		},
		async revoke(id, revokedAt) {
			const identity = identities.get(id);
			if (!identity || identity.status !== "active") {
				return null;
			}
			const updated = { ...identity, status: "revoked" as const, revokedAt };
			identities.set(id, updated);
			return updated;
		},
	};
}

export function createInMemorySessionRefRepository(
	seed: SessionRef[] = [],
): SessionRefRepository {
	const sessions = new Map(seed.map((item) => [item.id, { ...item }]));

	function findByExternalRefHash(externalRefHash: string): SessionRef | null {
		for (const session of sessions.values()) {
			if (session.externalRefHash === externalRefHash) {
				return session;
			}
		}
		return null;
	}

	return {
		async findById(id) {
			return sessions.get(id) ?? null;
		},
		async findByExternalRefHash(externalRefHash) {
			return findByExternalRefHash(externalRefHash);
		},
		async listByPrincipalId(principalId) {
			return [...sessions.values()].filter(
				(session) => session.principalId === principalId,
			);
		},
		async listRevoked(since) {
			return [...sessions.values()].filter(
				(session) =>
					session.status === "revoked" &&
					(!since || (session.revokedAt && session.revokedAt >= since)),
			);
		},
		async create(input: NewSessionRef) {
			const session: SessionRef = {
				id: input.id ?? crypto.randomUUID(),
				principalId: input.principalId,
				status: "active",
				externalRefHash: input.externalRefHash,
				createdAt: new Date(),
				revokedAt: null,
				revocationReason: null,
			};
			sessions.set(session.id, session);
			return session;
		},
		async recordRevoked(input) {
			const existing = findByExternalRefHash(input.externalRefHash);
			if (existing) {
				if (existing.status === "revoked") {
					return existing;
				}
				const revoked = {
					...existing,
					status: "revoked" as const,
					revokedAt: input.revokedAt,
					revocationReason: input.reasonCode ?? null,
				};
				sessions.set(revoked.id, revoked);
				return revoked;
			}
			const session: SessionRef = {
				id: input.id ?? crypto.randomUUID(),
				principalId: input.principalId,
				status: "revoked",
				externalRefHash: input.externalRefHash,
				createdAt: input.revokedAt,
				revokedAt: input.revokedAt,
				revocationReason: input.reasonCode ?? null,
			};
			sessions.set(session.id, session);
			return session;
		},
		async revoke(id, revokedAt, reasonCode) {
			const session = sessions.get(id);
			if (!session || session.status !== "active") {
				return null;
			}
			const updated = {
				...session,
				status: "revoked" as const,
				revokedAt,
				revocationReason: reasonCode ?? null,
			};
			sessions.set(id, updated);
			return updated;
		},
		async revokeActiveByPrincipalId(principalId, revokedAt, reasonCode) {
			const revoked: SessionRef[] = [];
			for (const session of sessions.values()) {
				if (
					session.principalId !== principalId ||
					session.status !== "active"
				) {
					continue;
				}
				const updated = {
					...session,
					status: "revoked" as const,
					revokedAt,
					revocationReason: reasonCode ?? null,
				};
				sessions.set(updated.id, updated);
				revoked.push(updated);
			}
			return revoked;
		},
	};
}

export function createInMemoryServiceCredentialRepository(
	seed: ServiceCredential[] = [],
): ServiceCredentialRepository {
	const credentials = new Map(seed.map((item) => [item.id, { ...item }]));
	return {
		async findById(id) {
			return credentials.get(id) ?? null;
		},
		async findByPrefix(prefix) {
			for (const credential of credentials.values()) {
				if (credential.prefix === prefix) {
					return credential;
				}
			}
			return null;
		},
		async listByServiceIdentityId(serviceIdentityId) {
			return [...credentials.values()].filter(
				(credential) => credential.serviceIdentityId === serviceIdentityId,
			);
		},
		async findActiveByServiceIdentityId(serviceIdentityId) {
			return [...credentials.values()].filter(
				(credential) =>
					credential.serviceIdentityId === serviceIdentityId &&
					credential.status === "active",
			);
		},
		async create(input: NewServiceCredential) {
			const credential: ServiceCredential = {
				id: crypto.randomUUID(),
				serviceIdentityId: input.serviceIdentityId,
				prefix: input.prefix,
				secretHash: input.secretHash,
				status: "active",
				issuedAt: new Date(),
				expiresAt: input.expiresAt ?? null,
				rotatedAt: null,
				rotatedToId: null,
				revokedAt: null,
			};
			credentials.set(credential.id, credential);
			return credential;
		},
		async markRotated(id, rotatedToId, rotatedAt) {
			const credential = credentials.get(id);
			if (!credential || credential.status !== "active") {
				return null;
			}
			const updated = {
				...credential,
				status: "rotated" as const,
				rotatedAt,
				rotatedToId,
			};
			credentials.set(id, updated);
			return updated;
		},
		async revoke(id, revokedAt) {
			const credential = credentials.get(id);
			if (!credential || credential.status !== "active") {
				return null;
			}
			const updated = {
				...credential,
				status: "revoked" as const,
				revokedAt,
			};
			credentials.set(id, updated);
			return updated;
		},
		async revokeActiveByServiceIdentityId(serviceIdentityId, revokedAt) {
			const revoked: ServiceCredential[] = [];
			for (const credential of credentials.values()) {
				if (
					credential.serviceIdentityId !== serviceIdentityId ||
					credential.status !== "active"
				) {
					continue;
				}
				const updated = {
					...credential,
					status: "revoked" as const,
					revokedAt,
				};
				credentials.set(updated.id, updated);
				revoked.push(updated);
			}
			return revoked;
		},
	};
}

export function createInMemoryCommandJournal(): CommandJournalRepository {
	const entries = new Map<string, CommandJournalRecord>();
	return {
		async findByCommandId(commandId) {
			return entries.get(commandId) ?? null;
		},
		async record(entry: NewCommandJournalRecord) {
			const record: CommandJournalRecord = { ...entry, createdAt: new Date() };
			entries.set(entry.commandId, record);
			return record;
		},
	};
}

export interface InMemoryIdentityHarness {
	unitOfWork: IdentityUnitOfWork;
	published: DomainEventEnvelope[];
	principalRepository: PrincipalRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	sessionRefRepository: SessionRefRepository;
	commandJournal: CommandJournalRepository;
}

export function createRecordingUnitOfWork(
	principalRepository: PrincipalRepository,
	serviceIdentityRepository: ServiceIdentityRepository,
	overrides: {
		serviceCredentialRepository?: ServiceCredentialRepository;
		sessionRefRepository?: SessionRefRepository;
		commandJournal?: CommandJournalRepository;
	} = {},
): InMemoryIdentityHarness {
	const serviceCredentialRepository =
		overrides.serviceCredentialRepository ??
		createInMemoryServiceCredentialRepository();
	const sessionRefRepository =
		overrides.sessionRefRepository ?? createInMemorySessionRefRepository();
	const commandJournal =
		overrides.commandJournal ?? createInMemoryCommandJournal();
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: IdentityUnitOfWork = {
		async runInTransaction(work) {
			const run = transactionChain.then(async () => {
				const context: IdentityTransactionContext = {
					principalRepository,
					serviceIdentityRepository,
					serviceCredentialRepository,
					sessionRefRepository,
					commandJournal,
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
	return {
		unitOfWork,
		published,
		principalRepository,
		serviceIdentityRepository,
		serviceCredentialRepository,
		sessionRefRepository,
		commandJournal,
	};
}
