import {
	AgentsCommandError,
	type AgentPublishGuardPort,
	type BrainInvocationGuardPort,
} from "@anxionos/agents";
import {
	AGENTS_PUBLISH_CAPABILITY,
	AGENTS_SKILL_BIND_CAPABILITY,
	AGENTS_SKILL_EVALUATE_CAPABILITY,
} from "@anxionos/contracts/agents";
import type { SkillBindGuardPort, SkillEvaluationGuardPort } from "@anxionos/agents";
import { createEvaluationRefPromotionGate } from "@anxionos/agents";
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

export function createGovernanceSkillBindGuard(
	deps: GovernanceGuardDeps,
): SkillBindGuardPort {
	return {
		async assertBindAllowed(input) {
			const result = await evaluateAutonomyCapability(deps, {
				scopeId: input.agencyId,
				subjectAgentId: input.agentId,
				capability: AGENTS_SKILL_BIND_CAPABILITY,
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


export function createGovernanceSkillEvaluationGuard(
	deps: GovernanceGuardDeps,
): SkillEvaluationGuardPort {
	const refGate = createEvaluationRefPromotionGate();
	return {
		async assertEvaluationAllowed(input) {
			await refGate.assertEvaluationAllowed(input);
			const result = await evaluateAutonomyCapability(deps, {
				scopeId: input.agencyId,
				subjectAgentId: input.actorPrincipalId,
				capability: AGENTS_SKILL_EVALUATE_CAPABILITY,
			});
			if (result.allowed) {
				return;
			}
			const principalGrants = await deps.grantRepository.listEffective(
				input.agencyId,
				input.actorPrincipalId,
			);
			if (
				principalGrants.some(
					(grant) => grant.capability === AGENTS_SKILL_EVALUATE_CAPABILITY,
				)
			) {
				return;
			}
			denyTraversal(result.reason);
		},
	};
}
