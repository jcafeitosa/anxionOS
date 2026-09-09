import type { TaskboardMirrorPort } from "../../domain/ports/taskboard-mirror";

export interface DashiTaskboardMirrorConfig {
    baseUrl: string;
    projectId?: string | null;
}

export function createDashiTaskboardMirror(config: DashiTaskboardMirrorConfig): TaskboardMirrorPort {
    const baseUrl = config.baseUrl.replace(/\/$/, "");
    async function fetchIssue(issueIdentifier) {
        const res = await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(issueIdentifier)}`);
        if (res.status === 404)
            return null;
        if (!res.ok) {
            throw new Error(`Taskboard fetch failed for ${issueIdentifier}: ${res.status}`);
        }
        const data = (await res.json());
        const task = data.task;
        if (!task?.identifier || !task.status || task.version === undefined) {
            return null;
        }
        return {
            issueIdentifier: task.identifier,
            status: task.status,
            boardVersion: task.version,
            threadId: task.threadId ?? null,
        };
    }
    return {
        async getIssueStatus(issueIdentifier) {
            return fetchIssue(issueIdentifier);
        },
        async ingestWebhook(_payload) {
            throw new Error("Use ingestTaskboardWebhook command for webhook ingestion");
        },
        async listActiveIssues() {
            if (!config.projectId) {
                return [];
            }
            const res = await fetch(`${baseUrl}/api/tasks?projectId=${encodeURIComponent(config.projectId)}&status=in_progress`);
            if (!res.ok) {
                throw new Error(`Taskboard list failed: ${res.status}`);
            }
            const data = (await res.json());
            const tasks = data.tasks ?? [];
            return tasks
                .map((task) => {
                const identifier = String(task.identifier ?? "");
                const status = String(task.status ?? "");
                const version = Number(task.version ?? 0);
                if (!identifier || !status)
                    return null;
                return {
                    issueIdentifier: identifier,
                    status,
                    boardVersion: version,
                    threadId: task.threadId ?? null,
                };
            })
                .filter((item) => item !== null);
        },
    };
}
export async function resolveDashiProjectId(baseUrl, workspacePath, projectName = "anxionOS") {
    const normalized = baseUrl.replace(/\/$/, "");
    const res = await fetch(`${normalized}/api/projects`);
    if (!res.ok)
        return null;
    const data = (await res.json());
    const projects = data.projects ?? [];
    const byPath = projects.find((p) => p.workspacePath === workspacePath);
    if (byPath)
        return byPath.id;
    const byName = projects.find((p) => p.name === projectName);
    return byName?.id ?? null;
}
