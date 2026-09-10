import { and, count, eq, inArray, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { RunHeartbeat } from "../../domain/entities/run-heartbeat";
import type { RunHeartbeatRepository } from "../../domain/ports/run-heartbeat-repository";
import type { RunHeartbeatRow } from "./schema";
import {} from "./schema";
import { runHeartbeats, runs } from "./schema";

export function toRunHeartbeat(row: RunHeartbeatRow): RunHeartbeat {
	return {
		id: row.id,
		runId: row.runId,
		taskId: row.taskId,
		agentId: row.agentId,
		coalesceKey: row.coalesceKey,
		nextWakeAt: row.nextWakeAt,
		status: row.status,
		attempt: row.attempt,
		createdAt: row.createdAt,
		processedAt: row.processedAt,
	};
}
export function createDrizzleRunHeartbeatRepository(
	db: NodePgDatabase<Record<string, unknown>>,
): RunHeartbeatRepository {
	return {
		async findById(heartbeatId) {
			const rows = await db
				.select()
				.from(runHeartbeats)
				.where(eq(runHeartbeats.id, heartbeatId))
				.limit(1);
			return rows[0] ? toRunHeartbeat(rows[0]) : null;
		},
		async findPendingByCoalesceKey(coalesceKey) {
			const rows = await db
				.select()
				.from(runHeartbeats)
				.where(
					and(
						eq(runHeartbeats.coalesceKey, coalesceKey),
						eq(runHeartbeats.status, "pending"),
					),
				)
				.limit(1);
			return rows[0] ? toRunHeartbeat(rows[0]) : null;
		},
		async countPendingByOrganization(organizationId) {
			const rows = await db
				.select({ value: count() })
				.from(runHeartbeats)
				.innerJoin(runs, eq(runHeartbeats.runId, runs.id))
				.where(
					and(
						eq(runs.organizationId, organizationId),
						eq(runHeartbeats.status, "pending"),
					),
				);
			return Number(rows[0]?.value ?? 0);
		},
		async findDuePending(limit, now) {
			const rows = await db
				.select()
				.from(runHeartbeats)
				.where(
					and(
						eq(runHeartbeats.status, "pending"),
						lte(runHeartbeats.nextWakeAt, now),
					),
				)
				.orderBy(runHeartbeats.nextWakeAt)
				.limit(limit);
			return rows.map(toRunHeartbeat);
		},
		async save(heartbeat) {
			const existing = await db
				.select()
				.from(runHeartbeats)
				.where(eq(runHeartbeats.id, heartbeat.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(runHeartbeats)
					.set({
						runId: heartbeat.runId,
						taskId: heartbeat.taskId,
						agentId: heartbeat.agentId,
						coalesceKey: heartbeat.coalesceKey,
						nextWakeAt: heartbeat.nextWakeAt,
						status: heartbeat.status,
						attempt: heartbeat.attempt,
						processedAt: heartbeat.processedAt,
					})
					.where(eq(runHeartbeats.id, heartbeat.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update run heartbeat");
				return toRunHeartbeat(row);
			}
			try {
				const rows = await db
					.insert(runHeartbeats)
					.values({
						id: heartbeat.id,
						runId: heartbeat.runId,
						taskId: heartbeat.taskId,
						agentId: heartbeat.agentId,
						coalesceKey: heartbeat.coalesceKey,
						nextWakeAt: heartbeat.nextWakeAt,
						status: heartbeat.status,
						attempt: heartbeat.attempt,
						createdAt: heartbeat.createdAt,
						processedAt: heartbeat.processedAt,
					})
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to create run heartbeat");
				return toRunHeartbeat(row);
			} catch (error) {
				if (
					error instanceof Error &&
					error.message.includes(
						"orchestration_run_heartbeats_coalesce_pending_uidx",
					)
				) {
					const pending = await this.findPendingByCoalesceKey(
						heartbeat.coalesceKey,
					);
					if (pending) return pending;
				}
				throw error;
			}
		},
		async cancelPendingForRun(runId, now) {
			const rows = await db
				.update(runHeartbeats)
				.set({ status: "cancelled", processedAt: now })
				.where(
					and(
						eq(runHeartbeats.runId, runId),
						inArray(runHeartbeats.status, ["pending", "processing"]),
					),
				)
				.returning({ id: runHeartbeats.id });
			return rows.length;
		},
	};
}
