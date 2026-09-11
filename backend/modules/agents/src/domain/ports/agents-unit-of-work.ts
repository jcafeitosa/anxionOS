import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { AgentBudgetRepository } from "./agent-budget-repository";
import type { AgentRepository } from "./agent-repository";
import type { AgentRoutineRepository } from "./agent-routine-repository";
import type { AgentSkillBindingRepository } from "./agent-skill-binding-repository";
import type { AgentVersionRepository } from "./agent-version-repository";
import type { CommandJournalRepository } from "./command-journal";
import type { SkillRepository } from "./skill-repository";
import type { SkillVersionRepository } from "./skill-version-repository";
import type { TenantContext } from "./tenant-context";

export interface AgentsTransactionContext {
	client: unknown;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	skillRepository: SkillRepository;
	skillVersionRepository: SkillVersionRepository;
	agentRoutineRepository: AgentRoutineRepository;
	agentBudgetRepository: AgentBudgetRepository;
	agentSkillBindingRepository: AgentSkillBindingRepository;
	commandJournal: CommandJournalRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface AgentsUnitOfWork {
	runInTransaction<T>(
		ctx: TenantContext | undefined,
		work: (context: AgentsTransactionContext) => Promise<T>,
	): Promise<T>;
}
