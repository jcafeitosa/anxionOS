import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { AgentRepository } from "./agent-repository";
import type { AgentVersionRepository } from "./agent-version-repository";
import type { CommandJournalRepository } from "./command-journal";
import type { TenantContext } from "./tenant-context";

export interface AgentsTransactionContext {
	client: unknown;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface AgentsUnitOfWork {
	runInTransaction<T>(
		ctx: TenantContext | undefined,
		work: (context: AgentsTransactionContext) => Promise<T>,
	): Promise<T>;
}
