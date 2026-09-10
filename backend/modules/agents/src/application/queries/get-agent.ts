import type { Agent } from "../../domain/entities/agent";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import { throwAgentsError } from "../errors";

export interface GetAgentDeps {
	agentRepository: AgentRepository;
}

export async function getAgent(
	deps: GetAgentDeps,
	input: { agentId: string; organizationId: string },
): Promise<Agent> {
	const agent = await deps.agentRepository.findById(input.agentId);
	if (!agent || agent.organizationId !== input.organizationId) {
		throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${input.agentId}`);
	}
	return agent;
}
