import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AgentRoutine } from "../../domain/entities/agent-routine";
import type { AgentRoutineRepository } from "../../domain/ports/agent-routine-repository";
import { type AgentRoutineRow, agentRoutines } from "./schema";

export function toAgentRoutine(row: AgentRoutineRow): AgentRoutine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		agentId: row.agentId,
		slug: row.slug,
		displayName: row.displayName,
		triggerKind: row.triggerKind,
		triggerConfig: (row.triggerConfig ?? {}) as AgentRoutine["triggerConfig"],
		cooldownSeconds: row.cooldownSeconds,
		status: row.status,
		lastDedupeKey: row.lastDedupeKey ?? undefined,
		lastRunId: row.lastRunId ?? undefined,
		lastTriggeredAt: row.lastTriggeredAt ?? undefined,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAgentRoutineRepository(
	db: NodePgDatabase<{ agentRoutines: typeof agentRoutines }>,
): AgentRoutineRepository {
	return {
		async save(routine) {
			const existing = await db
				.select()
				.from(agentRoutines)
				.where(eq(agentRoutines.id, routine.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(agentRoutines)
					.set({
						displayName: routine.displayName,
						triggerKind: routine.triggerKind,
						triggerConfig: routine.triggerConfig,
						cooldownSeconds: routine.cooldownSeconds,
						status: routine.status,
						lastDedupeKey: routine.lastDedupeKey ?? null,
						lastRunId: routine.lastRunId ?? null,
						lastTriggeredAt: routine.lastTriggeredAt ?? null,
						revision: routine.revision,
						updatedAt: routine.updatedAt,
					})
					.where(eq(agentRoutines.id, routine.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update agent routine");
				return toAgentRoutine(row);
			}
			const rows = await db
				.insert(agentRoutines)
				.values({
					id: routine.id,
					tenantId: routine.organizationId,
					organizationId: routine.organizationId,
					agentId: routine.agentId,
					slug: routine.slug,
					displayName: routine.displayName,
					triggerKind: routine.triggerKind,
					triggerConfig: routine.triggerConfig,
					cooldownSeconds: routine.cooldownSeconds,
					status: routine.status,
					lastDedupeKey: routine.lastDedupeKey ?? null,
					lastRunId: routine.lastRunId ?? null,
					lastTriggeredAt: routine.lastTriggeredAt ?? null,
					revision: routine.revision,
					createdAt: routine.createdAt,
					updatedAt: routine.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agent routine");
			return toAgentRoutine(row);
		},
		async findById(routineId) {
			const rows = await db
				.select()
				.from(agentRoutines)
				.where(eq(agentRoutines.id, routineId))
				.limit(1);
			return rows[0] ? toAgentRoutine(rows[0]) : null;
		},
		async findByAgentAndSlug(agentId, slug) {
			const rows = await db
				.select()
				.from(agentRoutines)
				.where(
					and(eq(agentRoutines.agentId, agentId), eq(agentRoutines.slug, slug)),
				)
				.limit(1);
			return rows[0] ? toAgentRoutine(rows[0]) : null;
		},
	};
}
