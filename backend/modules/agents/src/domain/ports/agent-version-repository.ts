import type { AgentVersion } from "../entities/agent-version";

export interface AgentVersionRepository {
	save(version: AgentVersion): Promise<AgentVersion>;
	findById(versionId: string): Promise<AgentVersion | null>;
	findByAgentAndVersionNumber(
		agentId: string,
		versionNumber: number,
	): Promise<AgentVersion | null>;
	listByAgentId(agentId: string): Promise<AgentVersion[]>;
}
