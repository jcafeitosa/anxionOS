import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { GoalRepository } from "../../domain/ports/goal-repository";
import { goals } from "./schema";

function toGoal(row: import("./schema").GoalRow) {
	return {
		id: row.id,
		organizationId: row.organizationId,
		parentGoalId: row.parentGoalId,
		title: row.title,
		priority: row.priority,
		status: row.status,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
export function createDrizzleGoalRepository(
	db: NodePgDatabase<Record<string, unknown>>,
): GoalRepository {
	return {
		async findById(organizationId, goalId) {
			const rows = await db
				.select()
				.from(goals)
				.where(
					and(eq(goals.id, goalId), eq(goals.organizationId, organizationId)),
				)
				.limit(1);
			return rows[0] ? toGoal(rows[0]) : null;
		},
		async listByOrganization(organizationId) {
			const rows = await db
				.select()
				.from(goals)
				.where(eq(goals.organizationId, organizationId));
			return rows.map(toGoal);
		},
		async save(goal) {
			const existing = await db
				.select()
				.from(goals)
				.where(
					and(
						eq(goals.id, goal.id),
						eq(goals.organizationId, goal.organizationId),
					),
				)
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(goals)
					.set({
						parentGoalId: goal.parentGoalId,
						title: goal.title,
						priority: goal.priority,
						status: goal.status,
						revision: goal.revision,
						updatedAt: goal.updatedAt,
					})
					.where(
						and(
							eq(goals.id, goal.id),
							eq(goals.organizationId, goal.organizationId),
						),
					)
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update goal");
				return toGoal(row);
			}
			const rows = await db
				.insert(goals)
				.values({
					id: goal.id,
					organizationId: goal.organizationId,
					parentGoalId: goal.parentGoalId,
					title: goal.title,
					priority: goal.priority,
					status: goal.status,
					revision: goal.revision,
					createdAt: goal.createdAt,
					updatedAt: goal.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create goal");
			return toGoal(row);
		},
	};
}
