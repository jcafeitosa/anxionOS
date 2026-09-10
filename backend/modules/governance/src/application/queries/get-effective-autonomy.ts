import type { AutonomyLevel } from "@anxionos/contracts/governance";
import type { AutonomyAssignment } from "../../domain/entities/autonomy-assignment";
import type { AutonomyAssignmentRepository } from "../../domain/ports/autonomy-assignment-repository";

export interface GetEffectiveAutonomyInput {
	scopeId: string;
	subjectAgentId: string;
}

export interface EffectiveAutonomyResult {
	level: AutonomyLevel | null;
	assignment: AutonomyAssignment | null;
}

export interface GetEffectiveAutonomyDeps {
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
}

export async function getEffectiveAutonomy(
	deps: GetEffectiveAutonomyDeps,
	input: GetEffectiveAutonomyInput,
): Promise<EffectiveAutonomyResult> {
	const assignment =
		await deps.autonomyAssignmentRepository.findActiveByAgentAndScope(
			input.scopeId,
			input.subjectAgentId,
		);
	return {
		level: assignment?.level ?? null,
		assignment,
	};
}
