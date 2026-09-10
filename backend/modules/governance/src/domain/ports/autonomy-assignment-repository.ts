import type { AutonomyAssignment } from "../entities/autonomy-assignment";

export interface AutonomyAssignmentRepository {
	save(assignment: AutonomyAssignment): Promise<AutonomyAssignment>;
	findById(assignmentId: string): Promise<AutonomyAssignment | null>;
	findActiveByAgentAndScope(
		scopeId: string,
		subjectAgentId: string,
	): Promise<AutonomyAssignment | null>;
}
