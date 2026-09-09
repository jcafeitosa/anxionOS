import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { PrincipalRepository } from "./principal-repository";
import type { ServiceIdentityRepository } from "./service-identity-repository";

export interface IdentityTransactionContext {
	principalRepository: PrincipalRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface IdentityUnitOfWork {
	runInTransaction<T>(
		work: (context: IdentityTransactionContext) => Promise<T>,
	): Promise<T>;
}
