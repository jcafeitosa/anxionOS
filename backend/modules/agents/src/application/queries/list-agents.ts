import type { Agent } from "../../domain/entities/agent";
import type { AgentRepository } from "../../domain/ports/agent-repository";

export interface ListAgentsDeps {
	agentRepository: AgentRepository;
}

export async function listAgents(
	deps: ListAgentsDeps,
	input: { organizationId: string; agencyId: string },
): Promise<Agent[]> {
	return deps.agentRepository.listByAgency(input);
}
