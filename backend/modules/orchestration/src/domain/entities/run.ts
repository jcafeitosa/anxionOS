import type {
	RunStatus,
	WaitingHumanContext,
} from "@anxionos/contracts/orchestration";

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
	waitingHuman: WaitingHumanContext | null;
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
	waitingHuman?: WaitingHumanContext | null;
}

const TERMINAL_RUN_STATUSES = new Set([
	"COMPLETED",
	"ORPHANED",
	"BUDGET_STOPPED",
	"TERMINATED",
]);
const RUN_STATUS_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
	SCHEDULED: ["WAKING", "TERMINATED"],
	WAKING: ["ACTIVE", "ORPHANED", "TERMINATED"],
	ACTIVE: [
		"PAUSED",
		"WAITING_HUMAN_INPUT",
		"COMPLETED",
		"ORPHANED",
		"BUDGET_STOPPED",
		"TERMINATED",
	],
	PAUSED: ["ACTIVE", "WAITING_HUMAN_INPUT", "ORPHANED", "TERMINATED"],
	COMPLETED: [],
	ORPHANED: ["WAKING", "TERMINATED"],
	WAITING_HUMAN_INPUT: ["ACTIVE", "TERMINATED", "ORPHANED"],
	BUDGET_STOPPED: ["TERMINATED"],
	TERMINATED: [],
};
export function isTerminalRunStatus(status: RunStatus): boolean {
	return TERMINAL_RUN_STATUSES.has(status);
}
export function canTransitionRunStatus(
	from: RunStatus,
	to: RunStatus,
): boolean {
	if (from === to) {
		return true;
	}
	return RUN_STATUS_TRANSITIONS[from].includes(to);
}
