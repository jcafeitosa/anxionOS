import {
	AgentsCommandError,
	type AgentPublishGuardPort,
	type BrainInvocationGuardPort,
} from "@anxionos/agents";
import { AGENTS_PUBLISH_CAPABILITY } from "@anxionos/contracts/agents";
import {
	evaluateAutonomyCapability,
	type AutonomyAssignmentRepository,
	type GrantRepository,
} from "@anxionos/governance";

export interface GovernanceGuardDeps {
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
	grantRepository: GrantRepository;
}

function denyTraversal(reason?: string): never {
	throw new AgentsCommandError(
		"AGT_TRAVERSAL_DENIED",
		reason ?? "Traversal denied by governance",
	);
}

export function createGovernancePublishGuard(
	deps: GovernanceGuardDeps,
): AgentPublishGuardPort {
	return {
		async assertPublishAllowed(input) {
			const result = await evaluateAutonomyCapability(deps, {
				scopeId: input.agencyId,
				subjectAgentId: input.agentId,
				capability: AGENTS_PUBLISH_CAPABILITY,
			});
			if (!result.allowed) {
				denyTraversal(result.reason);
			}
		},
	};
}

export function createGovernanceInvocationGuard(
	deps: GovernanceGuardDeps,
): BrainInvocationGuardPort {
	return {
		async assertInvokeAllowed(input) {
			const result = await evaluateAutonomyCapability(deps, {
				scopeId: input.agencyId,
				subjectAgentId: input.agentId,
				capability: input.capabilityId,
			});
			if (!result.allowed) {
				denyTraversal(result.reason);
			}
		},
	};
}
