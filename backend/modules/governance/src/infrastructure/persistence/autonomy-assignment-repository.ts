import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AutonomyAssignment } from "../../domain/entities/autonomy-assignment";
import type { AutonomyAssignmentRepository } from "../../domain/ports/autonomy-assignment-repository";
import { type AutonomyAssignmentRow, autonomyAssignments } from "./schema";

export class AutonomyAssignmentRevisionConflictError extends Error {
	constructor() {
		super("Autonomy assignment revision conflict");
		this.name = "AutonomyAssignmentRevisionConflictError";
	}
}

function toAutonomyAssignment(row: AutonomyAssignmentRow): AutonomyAssignment {
	return {
		id: row.id,
		tenantId: row.tenantId,
		agencyId: row.agencyId,
		scopeId: row.scopeId,
		subjectAgentId: row.subjectAgentId,
		level: row.level,
		status: row.status,
		evidenceHash: row.evidenceHash,
		approvalId: row.approvalId,
		authorityEpochAtAssignment: row.authorityEpochAtAssignment,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAutonomyAssignmentRepository(
	db: NodePgDatabase<{ autonomyAssignments: typeof autonomyAssignments }>,
): AutonomyAssignmentRepository {
	return {
		async save(assignment: AutonomyAssignment) {
			const existing = await db
				.select()
				.from(autonomyAssignments)
				.where(eq(autonomyAssignments.id, assignment.id))
				.limit(1);
			if (existing[0]) {
				const expectedRevision = assignment.revision - 1;
				const rows = await db
					.update(autonomyAssignments)
					.set({
						level: assignment.level,
						status: assignment.status,
						evidenceHash: assignment.evidenceHash,
						approvalId: assignment.approvalId,
						authorityEpochAtAssignment: assignment.authorityEpochAtAssignment,
						revision: assignment.revision,
						updatedAt: assignment.updatedAt,
					})
					.where(
						and(
							eq(autonomyAssignments.id, assignment.id),
							eq(autonomyAssignments.revision, expectedRevision),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) {
					throw new AutonomyAssignmentRevisionConflictError();
				}
				return toAutonomyAssignment(row);
			}
			const rows = await db
				.insert(autonomyAssignments)
				.values({
					id: assignment.id,
					tenantId: assignment.tenantId,
					agencyId: assignment.agencyId,
					scopeId: assignment.scopeId,
					subjectAgentId: assignment.subjectAgentId,
					level: assignment.level,
					status: assignment.status,
					evidenceHash: assignment.evidenceHash,
					approvalId: assignment.approvalId,
					authorityEpochAtAssignment: assignment.authorityEpochAtAssignment,
					revision: assignment.revision,
					createdAt: assignment.createdAt,
					updatedAt: assignment.updatedAt,
				})
				.returning();
			return toAutonomyAssignment(rows[0]);
		},
		async findById(assignmentId: string) {
			const rows = await db
				.select()
				.from(autonomyAssignments)
				.where(eq(autonomyAssignments.id, assignmentId))
				.limit(1);
			return rows[0] ? toAutonomyAssignment(rows[0]) : null;
		},
		async findActiveByAgentAndScope(scopeId: string, subjectAgentId: string) {
			const rows = await db
				.select()
				.from(autonomyAssignments)
				.where(
					and(
						eq(autonomyAssignments.scopeId, scopeId),
						eq(autonomyAssignments.subjectAgentId, subjectAgentId),
						eq(autonomyAssignments.status, "active"),
					),
				)
				.limit(1);
			return rows[0] ? toAutonomyAssignment(rows[0]) : null;
		},
	};
}
