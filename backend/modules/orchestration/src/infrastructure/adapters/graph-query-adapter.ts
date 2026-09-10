import type { GraphQueryPort } from "../../domain/ports/graph-query";

export interface GraphQueryAdapterConfig {
	explainEscalationPath?: (
		agentId: string,
		organizationId: string,
	) => Promise<{
		path: string[];
		complete: boolean;
	}>;
}

export function createGraphQueryAdapter(
	config: GraphQueryAdapterConfig = {},
): GraphQueryPort {
	const explainEscalationPath =
		config.explainEscalationPath ??
		(async (agentId, organizationId) => ({
			path: [agentId, organizationId],
			complete: true,
		}));
	return {
		explainEscalationPath,
	};
}
