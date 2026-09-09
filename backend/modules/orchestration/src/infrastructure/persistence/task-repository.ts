import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { TaskRepository } from "../../domain/ports/task-repository";
import { and, eq, isNull } from "drizzle-orm";
import { taskLeases, tasks } from "./schema";

function toTask(row) {
    return {
        id: row.id,
        organizationId: row.organizationId,
        goalId: row.goalId,
        goalAncestry: row.goalAncestry,
        parentTaskId: row.parentTaskId,
        issueIdentifier: row.issueIdentifier,
        title: row.title,
        checkoutStatus: row.checkoutStatus,
        revision: row.revision,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
function toTaskLease(row) {
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
export function createDrizzleTaskRepository(db: NodePgDatabase<Record<string, unknown>>): TaskRepository {
    return {
        async findById(organizationId, taskId) {
            const rows = await db
                .select()
                .from(tasks)
                .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)))
                .limit(1);
            return rows[0] ? toTask(rows[0]) : null;
        },
        async findByIdForUpdate(organizationId, taskId) {
            const rows = await db
                .select()
                .from(tasks)
                .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, organizationId)))
                .limit(1);
            const taskRow = rows[0];
            if (!taskRow)
                return null;
            const leaseRows = await db
                .select()
                .from(taskLeases)
                .where(and(eq(taskLeases.taskId, taskId), isNull(taskLeases.releasedAt)))
                .limit(1);
            return { ...toTask(taskRow), lease: leaseRows[0] ? toTaskLease(leaseRows[0]) : null };
        },
        async findByIssueIdentifier(organizationId, issueIdentifier) {
            const rows = await db
                .select()
                .from(tasks)
                .where(and(eq(tasks.organizationId, organizationId), eq(tasks.issueIdentifier, issueIdentifier)))
                .limit(1);
            return rows[0] ? toTask(rows[0]) : null;
        },
        async findByIssueIdentifierOnly(issueIdentifier) {
            const rows = await db
                .select()
                .from(tasks)
                .where(eq(tasks.issueIdentifier, issueIdentifier))
                .limit(1);
            return rows[0] ? toTask(rows[0]) : null;
        },
        async save(task) {
            const existing = await db
                .select()
                .from(tasks)
                .where(and(eq(tasks.id, task.id), eq(tasks.organizationId, task.organizationId)))
                .limit(1);
            if (existing[0]) {
                const rows = await db
                    .update(tasks)
                    .set({
                    goalId: task.goalId,
                    goalAncestry: task.goalAncestry,
                    parentTaskId: task.parentTaskId,
                    issueIdentifier: task.issueIdentifier,
                    title: task.title,
                    checkoutStatus: task.checkoutStatus,
                    revision: task.revision,
                    updatedAt: task.updatedAt,
                })
                    .where(and(eq(tasks.id, task.id), eq(tasks.organizationId, task.organizationId)))
                    .returning();
                const row = rows[0];
                if (!row)
                    throw new Error("Failed to update task");
                return toTask(row);
            }
            const rows = await db
                .insert(tasks)
                .values({
                id: task.id,
                organizationId: task.organizationId,
                goalId: task.goalId,
                goalAncestry: task.goalAncestry,
                parentTaskId: task.parentTaskId,
                issueIdentifier: task.issueIdentifier,
                title: task.title,
                checkoutStatus: task.checkoutStatus,
                revision: task.revision,
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            })
                .returning();
            const row = rows[0];
            if (!row)
                throw new Error("Failed to create task");
            return toTask(row);
        },
    };
}
