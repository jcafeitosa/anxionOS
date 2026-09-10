import { and, eq, isNull, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { TaskLease } from "../../domain/entities/task-lease";
import type { TaskLeaseRepository } from "../../domain/ports/task-lease-repository";
import type { TaskLeaseRow } from "./schema";
import {} from "./schema";
import { taskLeases, tasks } from "./schema";

export function toTaskLease(row: TaskLeaseRow): TaskLease {
	return {
		id: row.id,
		taskId: row.taskId,
		runId: row.runId,
		agentId: row.agentId,
		leaseToken: row.leaseToken,
		leasedAt: row.leasedAt,
		expiresAt: row.expiresAt,
		heartbeatDueAt: row.heartbeatDueAt,
		releasedAt: row.releasedAt,
		createdAt: row.createdAt,
	};
}
export function createDrizzleTaskLeaseRepository(
	db: NodePgDatabase<Record<string, unknown>>,
): TaskLeaseRepository {
	return {
		async findActiveByTaskId(taskId) {
			const rows = await db
				.select()
				.from(taskLeases)
				.where(
					and(eq(taskLeases.taskId, taskId), isNull(taskLeases.releasedAt)),
				)
				.limit(1);
			return rows[0] ? toTaskLease(rows[0]) : null;
		},
		async findByTaskIdAndToken(taskId, leaseToken) {
			const rows = await db
				.select()
				.from(taskLeases)
				.where(
					and(
						eq(taskLeases.taskId, taskId),
						eq(taskLeases.leaseToken, leaseToken),
						isNull(taskLeases.releasedAt),
					),
				)
				.limit(1);
			return rows[0] ? toTaskLease(rows[0]) : null;
		},
		async findExpiredActive(before, limit) {
			const rows = await db
				.select({
					lease: taskLeases,
					organizationId: tasks.organizationId,
				})
				.from(taskLeases)
				.innerJoin(tasks, eq(taskLeases.taskId, tasks.id))
				.where(
					and(isNull(taskLeases.releasedAt), lt(taskLeases.expiresAt, before)),
				)
				.orderBy(taskLeases.expiresAt)
				.limit(limit);
			return rows.map((row) => ({
				...toTaskLease(row.lease),
				organizationId: row.organizationId,
			}));
		},
		async save(lease) {
			const existing = await db
				.select()
				.from(taskLeases)
				.where(eq(taskLeases.id, lease.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(taskLeases)
					.set({
						runId: lease.runId,
						agentId: lease.agentId,
						leaseToken: lease.leaseToken,
						leasedAt: lease.leasedAt,
						expiresAt: lease.expiresAt,
						heartbeatDueAt: lease.heartbeatDueAt,
						releasedAt: lease.releasedAt,
					})
					.where(eq(taskLeases.id, lease.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update task lease");
				return toTaskLease(row);
			}
			const rows = await db
				.insert(taskLeases)
				.values({
					id: lease.id,
					taskId: lease.taskId,
					runId: lease.runId,
					agentId: lease.agentId,
					leaseToken: lease.leaseToken,
					leasedAt: lease.leasedAt,
					expiresAt: lease.expiresAt,
					heartbeatDueAt: lease.heartbeatDueAt,
					releasedAt: lease.releasedAt,
					createdAt: lease.createdAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create task lease");
			return toTaskLease(row);
		},
	};
}
