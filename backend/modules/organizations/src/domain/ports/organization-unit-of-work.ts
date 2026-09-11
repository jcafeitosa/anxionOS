import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { AgencyRepository } from "./agency-repository";
import type { CommandJournalRepository } from "./command-journal";
import type { MembershipRepository } from "./membership-repository";
import type { OwnerRepository } from "./owner-repository";
import type { TenantContext } from "./tenant-context";

export interface OrganizationTransactionContext {
	client: unknown;
	agencyRepository: AgencyRepository;
	ownerRepository: OwnerRepository;
	membershipRepository: MembershipRepository;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface OrganizationCommandOutcome<
	TResponse = Record<string, unknown>,
> {
	response: TResponse;
	events: DomainEventEnvelope[];
}
/**
 * Atomic state + command journal + eventing journal/outbox — implemented in S3.
 */
export interface OrganizationUnitOfWork {
	runInTransaction<T>(
		ctx: TenantContext | undefined,
		work: (context: OrganizationTransactionContext) => Promise<T>,
	): Promise<T>;
}
