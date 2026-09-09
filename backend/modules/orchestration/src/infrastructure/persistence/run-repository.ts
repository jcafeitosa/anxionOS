import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Run } from "../../domain/entities/run";
import type { RunRepository } from "../../domain/ports/run-repository";
import { type RunRow } from "./schema";
import { and, eq, notInArray } from "drizzle-orm";
import { runs } from "./schema";

const TERMINAL_RUN_STATUSES = [
    "COMPLETED",
    "ORPHANED",
    "BUDGET_STOPPED",
    "TERMINATED",
];
export function toRun(row: RunRow): Run {
    return {
        id: row.id,
        taskId: row.taskId,
        agentId: row.agentId,
        organizationId: row.organizationId,
        goalAncestry: row.goalAncestry,
        issueIdentifier: row.issueIdentifier,
        parentRunId: row.parentRunId,
        status: row.status,
        coalesceKey: row.coalesceKey,
        revision: row.revision,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
export function createDrizzleRunRepository(db: NodePgDatabase<Record<string, unknown>>): RunRepository {
    return {
        async findById(organizationId, runId) {
            const rows = await db
                .select()
                .from(runs)
                .where(and(eq(runs.id, runId), eq(runs.organizationId, organizationId)))
                .limit(1);
            return rows[0] ? toRun(rows[0]) : null;
        },
        async findActiveByTaskAndAgent(organizationId, taskId, agentId) {
            const rows = await db
                .select()
                .from(runs)
                .where(and(eq(runs.organizationId, organizationId), eq(runs.taskId, taskId), eq(runs.agentId, agentId), notInArray(runs.status, [...TERMINAL_RUN_STATUSES])))
                .limit(1);
            return rows[0] ? toRun(rows[0]) : null;
        },
        async save(run) {
            const existing = await db
                .select()
                .from(runs)
                .where(and(eq(runs.id, run.id), eq(runs.organizationId, run.organizationId)))
                .limit(1);
            if (existing[0]) {
                const rows = await db
                    .update(runs)
                    .set({
                    taskId: run.taskId,
                    agentId: run.agentId,
                    goalAncestry: run.goalAncestry,
                    issueIdentifier: run.issueIdentifier,
                    parentRunId: run.parentRunId,
                    status: run.status,
                    coalesceKey: run.coalesceKey,
                    revision: run.revision,
                    startedAt: run.startedAt,
                    completedAt: run.completedAt,
                    updatedAt: run.updatedAt,
                })
                    .where(and(eq(runs.id, run.id), eq(runs.organizationId, run.organizationId)))
                    .returning();
                const row = rows[0];
                if (!row)
                    throw new Error("Failed to update run");
                return toRun(row);
            }
            const rows = await db
                .insert(runs)
                .values({
                id: run.id,
                taskId: run.taskId,
                agentId: run.agentId,
                organizationId: run.organizationId,
                goalAncestry: run.goalAncestry,
                issueIdentifier: run.issueIdentifier,
                parentRunId: run.parentRunId,
                status: run.status,
                coalesceKey: run.coalesceKey,
                revision: run.revision,
                startedAt: run.startedAt,
                completedAt: run.completedAt,
                createdAt: run.createdAt,
                updatedAt: run.updatedAt,
            })
                .returning();
            const row = rows[0];
            if (!row)
                throw new Error("Failed to create run");
            return toRun(row);
        },
    };
}
