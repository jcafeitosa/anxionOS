import type { AutonomyLevel } from "@anxionos/contracts/governance";
import {
	isAutonomyLevelRuntimeEnabled,
	isCapabilityEligibleAtLevel,
} from "../../domain/policies/autonomy-normative-matrix";
import type { AutonomyAssignmentRepository } from "../../domain/ports/autonomy-assignment-repository";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import { getEffectiveAutonomy } from "./get-effective-autonomy";

export interface EvaluateAutonomyCapabilityInput {
	scopeId: string;
	subjectAgentId: string;
	capability: string;
}

export interface EvaluateAutonomyCapabilityResult {
	allowed: boolean;
	level: AutonomyLevel | null;
	reason?: string;
}

export interface EvaluateAutonomyCapabilityDeps {
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
	grantRepository: GrantRepository;
}

export async function evaluateAutonomyCapability(
	deps: EvaluateAutonomyCapabilityDeps,
	input: EvaluateAutonomyCapabilityInput,
): Promise<EvaluateAutonomyCapabilityResult> {
	const effective = await getEffectiveAutonomy(deps, input);
	if (!effective.level) {
		return {
			allowed: false,
			level: null,
			reason: "No autonomy assignment",
		};
	}
	if (!isAutonomyLevelRuntimeEnabled(effective.level)) {
		return {
			allowed: false,
			level: effective.level,
			reason: `Level ${effective.level} disabled at runtime`,
		};
	}
	if (!isCapabilityEligibleAtLevel(effective.level, input.capability)) {
		return {
			allowed: false,
			level: effective.level,
			reason: `Capability ${input.capability} not eligible at ${effective.level}`,
		};
	}
	const grants = await deps.grantRepository.listEffectiveForAgent(
		input.scopeId,
		input.subjectAgentId,
	);
	const grantedCapabilities = grants.map((grant) => grant.capability);
	if (!grantedCapabilities.includes(input.capability)) {
		return {
			allowed: false,
			level: effective.level,
			reason: `Capability ${input.capability} not granted individually`,
		};
	}
	return { allowed: true, level: effective.level };
}
