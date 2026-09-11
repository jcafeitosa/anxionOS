import type { AgentVersion } from "../../domain/entities/agent-version";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentVersionRepository } from "../../domain/ports/agent-version-repository";
import { throwAgentsError } from "../errors";

export interface ListAgentVersionsDeps {
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
}

export async function listAgentVersions(
	deps: ListAgentVersionsDeps,
	input: { agentId: string; organizationId: string },
): Promise<AgentVersion[]> {
	const agent = await deps.agentRepository.findById(input.agentId);
	if (!agent || agent.organizationId !== input.organizationId) {
		throwAgentsError(
			"AGT_AGENT_NOT_FOUND",
			`Agent not found: ${input.agentId}`,
		);
	}
	return deps.agentVersionRepository.listByAgentId(input.agentId);
}
