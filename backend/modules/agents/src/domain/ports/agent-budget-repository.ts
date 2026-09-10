import type { AgentBudgetPolicy } from "../entities/agent-budget-policy";

export interface AgentBudgetRepository {
	save(policy: AgentBudgetPolicy): Promise<AgentBudgetPolicy>;
	findByAgentId(agentId: string): Promise<AgentBudgetPolicy | null>;
}
