export interface TaskboardMirrorRecord {
    issueIdentifier: string;
    boardVersion: number;
    status: string;
    threadId: string | null;
    occurredAt: Date;
    ingestedAt: Date;
}
export interface NewTaskboardMirrorRecord {
    issueIdentifier: string;
    boardVersion: number;
    status: string;
    threadId?: string | null;
    occurredAt: Date;
}
export interface TaskboardMirrorRepository {
    recordIfAbsent(entry: NewTaskboardMirrorRecord): Promise<"inserted" | "duplicate">;
    findLatestByIssue(issueIdentifier: string): Promise<TaskboardMirrorRecord | null>;
}
