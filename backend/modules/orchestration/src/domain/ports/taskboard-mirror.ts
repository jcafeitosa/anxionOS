export interface TaskboardIssueSnapshot {
    issueIdentifier: string;
    status: string;
    boardVersion: number;
    threadId?: string | null;
}
export interface TaskboardMirrorPort {
    getIssueStatus(issueIdentifier: string): Promise<TaskboardIssueSnapshot | null>;
    ingestWebhook(payload: Record<string, unknown>): Promise<void>;
    listActiveIssues(): Promise<TaskboardIssueSnapshot[]>;
}
