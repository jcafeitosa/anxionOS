import {
	AUTONOMY_NORMATIVE_MATRIX,
	type AutonomyLevel,
	type AutonomyLevelDefinition,
	type AutonomyTransitionKind,
	RUNTIME_DISABLED_AUTONOMY_LEVELS,
} from "@anxionos/contracts/governance";

const LEVEL_ORDER: readonly AutonomyLevel[] = ["L0", "L1", "L2", "L3", "L4"];

export function getAutonomyLevelDefinition(
	level: AutonomyLevel,
): AutonomyLevelDefinition {
	const definition = AUTONOMY_NORMATIVE_MATRIX.find(
		(entry) => entry.level === level,
	);
	if (!definition) {
		throw new Error(`Unknown autonomy level: ${level}`);
	}
	return definition;
}

export function isAutonomyLevelRuntimeEnabled(level: AutonomyLevel): boolean {
	return !RUNTIME_DISABLED_AUTONOMY_LEVELS.includes(level);
}

export function isCapabilityEligibleAtLevel(
	level: AutonomyLevel,
	capability: string,
): boolean {
	const definition = getAutonomyLevelDefinition(level);
	return definition.eligibleCapabilities.includes(capability);
}

export function compareAutonomyLevels(
	from: AutonomyLevel,
	to: AutonomyLevel,
): number {
	return LEVEL_ORDER.indexOf(to) - LEVEL_ORDER.indexOf(from);
}

export interface TransitionValidationInput {
	currentLevel: AutonomyLevel | null;
	targetLevel: AutonomyLevel;
	transitionKind: AutonomyTransitionKind;
	hasApproval: boolean;
	hasEvidence: boolean;
}

export interface TransitionValidationResult {
	allowed: boolean;
	reason?: string;
}

export function validateAutonomyTransition(
	input: TransitionValidationInput,
): TransitionValidationResult {
	const {
		currentLevel,
		targetLevel,
		transitionKind,
		hasApproval,
		hasEvidence,
	} = input;

	if (!isAutonomyLevelRuntimeEnabled(targetLevel)) {
		return {
			allowed: false,
			reason: `Autonomy level ${targetLevel} is disabled at runtime`,
		};
	}

	const targetDefinition = getAutonomyLevelDefinition(targetLevel);

	if (currentLevel === null) {
		if (transitionKind !== "takeover") {
			return {
				allowed: false,
				reason: "No active assignment; use assign first",
			};
		}
		if (targetDefinition.requiresApprovalToAssign && !hasApproval) {
			return { allowed: false, reason: "Approval required for initial level" };
		}
		return { allowed: true };
	}

	if (currentLevel === targetLevel) {
		return { allowed: false, reason: "Target level equals current level" };
	}

	const delta = compareAutonomyLevels(currentLevel, targetLevel);

	switch (transitionKind) {
		case "demote":
			if (delta >= 0) {
				return { allowed: false, reason: "Demote requires lower target level" };
			}
			return { allowed: true };

		case "promote":
			if (delta <= 0) {
				return {
					allowed: false,
					reason: "Promote requires higher target level",
				};
			}
			if (delta > 1) {
				return {
					allowed: false,
					reason: "Promote allows at most one level step",
				};
			}
			if (!hasApproval) {
				return { allowed: false, reason: "Promotion requires approval" };
			}
			if (!hasEvidence) {
				return { allowed: false, reason: "Promotion requires evidence" };
			}
			return { allowed: true };

		case "takeover":
			if (!hasApproval) {
				return { allowed: false, reason: "Takeover requires approval" };
			}
			return { allowed: true };

		default:
			return { allowed: false, reason: "Unknown transition kind" };
	}
}

export function validateInitialAssignment(
	level: AutonomyLevel,
	hasApproval: boolean,
): TransitionValidationResult {
	if (!isAutonomyLevelRuntimeEnabled(level)) {
		return {
			allowed: false,
			reason: `Autonomy level ${level} is disabled at runtime`,
		};
	}
	const definition = getAutonomyLevelDefinition(level);
	if (definition.requiresApprovalToAssign && !hasApproval) {
		return { allowed: false, reason: "Approval required for this level" };
	}
	return { allowed: true };
}
