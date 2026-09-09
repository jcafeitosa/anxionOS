import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { TaskboardMirrorRepository } from "../../domain/ports/taskboard-mirror-repository";
import { desc, eq } from "drizzle-orm";
import { taskboardMirror } from "./schema";

function toRecord(row) {
    return {
        issueIdentifier: row.issueIdentifier,
        boardVersion: row.boardVersion,
        status: row.status,
        threadId: row.threadId,
        occurredAt: row.occurredAt,
        ingestedAt: row.ingestedAt,
    };
}
export function createDrizzleTaskboardMirrorRepository(db: NodePgDatabase<Record<string, unknown>>): TaskboardMirrorRepository {
    return {
        async recordIfAbsent(entry) {
            const rows = await db
                .insert(taskboardMirror)
                .values({
                issueIdentifier: entry.issueIdentifier,
                boardVersion: entry.boardVersion,
                status: entry.status,
                threadId: entry.threadId ?? null,
                occurredAt: entry.occurredAt,
            })
                .onConflictDoNothing()
                .returning();
            return rows[0] ? "inserted" : "duplicate";
        },
        async findLatestByIssue(issueIdentifier) {
            const rows = await db
                .select()
                .from(taskboardMirror)
                .where(eq(taskboardMirror.issueIdentifier, issueIdentifier))
                .orderBy(desc(taskboardMirror.boardVersion))
                .limit(1);
            return rows[0] ? toRecord(rows[0]) : null;
        },
    };
}
