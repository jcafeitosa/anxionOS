import type { RunStatus } from "@anxionos/contracts/orchestration";

export interface Run {
    id: string;
    taskId: string;
    agentId: string;
    organizationId: string;
    goalAncestry: string[];
    issueIdentifier: string;
    parentRunId: string | null;
    status: RunStatus;
    coalesceKey: string;
    revision: number;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface NewRun {
    taskId: string;
    agentId: string;
    organizationId: string;
    goalAncestry: string[];
    issueIdentifier: string;
    parentRunId?: string | null;
    status?: RunStatus;
    coalesceKey: string;
}

const TERMINAL_RUN_STATUSES = new Set([
    "COMPLETED",
    "ORPHANED",
    "BUDGET_STOPPED",
    "TERMINATED",
]);
const RUN_STATUS_TRANSITIONS = {
    SCHEDULED: ["WAKING", "TERMINATED"],
    WAKING: ["ACTIVE", "ORPHANED", "TERMINATED"],
    ACTIVE: ["PAUSED", "COMPLETED", "ORPHANED", "BUDGET_STOPPED", "TERMINATED"],
    PAUSED: ["ACTIVE", "ORPHANED", "TERMINATED"],
    COMPLETED: [],
    ORPHANED: ["WAKING", "TERMINATED"],
    BUDGET_STOPPED: ["TERMINATED"],
    TERMINATED: [],
};
export function isTerminalRunStatus(status: RunStatus): boolean {
    return TERMINAL_RUN_STATUSES.has(status);
}
export function canTransitionRunStatus(from: RunStatus, to: RunStatus): boolean {
    if (from === to) {
        return true;
    }
    return RUN_STATUS_TRANSITIONS[from].includes(to);
}
