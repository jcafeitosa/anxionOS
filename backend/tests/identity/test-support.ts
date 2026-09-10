import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { NewPrincipal, Principal } from "@anxionos/identity";
import type {
	NewServiceIdentity,
	ServiceIdentity,
} from "../../modules/identity/src/domain/entities/service-identity";
import type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "../../modules/identity/src/domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../modules/identity/src/domain/ports/principal-repository";
import type { ServiceIdentityRepository } from "../../modules/identity/src/domain/ports/service-identity-repository";

export function createInMemoryPrincipalRepository(
	seed: Principal[] = [],
): PrincipalRepository {
	const principals = new Map(seed.map((p) => [p.id, { ...p }]));
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
		async create(input: NewPrincipal) {
			const principal: Principal = {
				id: crypto.randomUUID(),
				authUserId: input.authUserId,
				email: input.email,
				status: "active",
				createdAt: new Date(),
				suspendedAt: null,
				suspensionReason: null,
			};
			principals.set(principal.id, principal);
			return principal;
		},
		async markSuspended(id, reasonCode, suspendedAt) {
			const principal = principals.get(id);
			if (!principal || principal.status !== "active") {
				return null;
			}
			const updated = {
				...principal,
				status: "suspended" as const,
				suspendedAt,
				suspensionReason: reasonCode,
			};
			principals.set(id, updated);
			return updated;
		},
		async reactivate(id) {
			const principal = principals.get(id);
			if (!principal || principal.status !== "suspended") {
				return null;
			}
			const updated = {
				...principal,
				status: "active" as const,
				suspendedAt: null,
				suspensionReason: null,
			};
			principals.set(id, updated);
			return updated;
		},
		async updateEmail(id, email) {
			const principal = principals.get(id);
			if (!principal) {
				return null;
			}
			const updated = { ...principal, email };
			principals.set(id, updated);
			return updated;
		},
		async linkAuthUserId(id, authUserId) {
			const principal = principals.get(id);
			if (!principal) {
				return null;
			}
			const updated = { ...principal, authUserId };
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
			if (!identity) {
				return null;
			}
			const updated = { ...identity, status: "revoked" as const, revokedAt };
			identities.set(id, updated);
			return updated;
		},
	};
}

export function createRecordingUnitOfWork(
	principalRepository: PrincipalRepository,
	serviceIdentityRepository: ServiceIdentityRepository,
): { unitOfWork: IdentityUnitOfWork; published: DomainEventEnvelope[] } {
	const published: DomainEventEnvelope[] = [];
	let transactionChain: Promise<unknown> = Promise.resolve();
	const unitOfWork: IdentityUnitOfWork = {
		async runInTransaction(work) {
			const run = transactionChain.then(async () => {
				const context: IdentityTransactionContext = {
					principalRepository,
					serviceIdentityRepository,
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
