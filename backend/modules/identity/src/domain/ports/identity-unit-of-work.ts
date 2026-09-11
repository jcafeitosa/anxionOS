import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
import type { PrincipalRepository } from "./principal-repository";
import type { ServiceCredentialRepository } from "./service-credential-repository";
import type { ServiceIdentityRepository } from "./service-identity-repository";
import type { SessionRefRepository } from "./session-ref-repository";

export interface IdentityTransactionContext {
	principalRepository: PrincipalRepository;
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	sessionRefRepository: SessionRefRepository;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

/** R03 INV-IDN-02: state + journal + outbox commit in a single transaction. */
export interface IdentityUnitOfWork {
	runInTransaction<T>(
		work: (context: IdentityTransactionContext) => Promise<T>,
	): Promise<T>;
}
