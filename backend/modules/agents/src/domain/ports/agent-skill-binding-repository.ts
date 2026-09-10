import type { AgentSkillBinding } from "../entities/agent-skill-binding";

export interface AgentSkillBindingRepository {
	save(binding: AgentSkillBinding): Promise<AgentSkillBinding>;
	findByAgentVersionAndSkillVersion(
		agentVersionId: string,
		skillVersionId: string,
	): Promise<AgentSkillBinding | null>;
}
