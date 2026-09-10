import type {
	AutonomyAssignmentStatus,
	AutonomyLevel,
} from "@anxionos/contracts/governance";

export interface AutonomyAssignment {
	id: string;
	tenantId: string;
	agencyId: string;
	scopeId: string;
	subjectAgentId: string;
	level: AutonomyLevel;
	status: AutonomyAssignmentStatus;
	evidenceHash: string | null;
	approvalId: string | null;
	authorityEpochAtAssignment: number;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}

export function isAutonomyAssignmentActive(
	assignment: AutonomyAssignment,
): boolean {
	return assignment.status === "active";
}
