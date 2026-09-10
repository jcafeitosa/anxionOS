import type { AgentRepository } from "../../domain/ports/agent-repository";

export interface AgentRegistryAdapter {
	isAgentActive(agentId: string, organizationId: string): Promise<boolean>;
}

export function createAgentRegistryAdapter(deps: {
	agentRepository: AgentRepository;
}): AgentRegistryAdapter {
	return {
		async isAgentActive(agentId: string, organizationId: string) {
			const agent = await deps.agentRepository.findById(agentId);
			if (!agent || agent.organizationId !== organizationId) {
				return false;
			}
			if (!agent.activeVersionId) {
				return false;
			}
			return agent.status === "ACTIVE" || agent.status === "READY";
		},
	};
}
