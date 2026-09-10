import type { Agent } from "../entities/agent";

export interface AgentRepository {
	save(agent: Agent): Promise<Agent>;
	findById(agentId: string): Promise<Agent | null>;
}
