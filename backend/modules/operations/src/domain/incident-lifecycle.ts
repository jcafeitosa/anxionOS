import type { OperationsIncidentStatus } from "@anxionos/contracts/operations";

const ALLOWED_TRANSITIONS: Record<
	OperationsIncidentStatus,
	readonly OperationsIncidentStatus[]
> = {
	OPEN: ["ACKNOWLEDGED", "INVESTIGATING", "ESCALATED"],
	ACKNOWLEDGED: ["INVESTIGATING", "MITIGATING", "ESCALATED"],
	INVESTIGATING: ["MITIGATING", "RESOLVED", "ESCALATED"],
	MITIGATING: ["RESOLVED", "INVESTIGATING", "ESCALATED"],
	ESCALATED: ["INVESTIGATING", "MITIGATING", "RESOLVED"],
	RESOLVED: ["CLOSED"],
	CLOSED: [],
};

const TERMINAL_STATUSES: ReadonlySet<OperationsIncidentStatus> = new Set([
	"CLOSED",
]);

export function canTransitionIncidentStatus(
	from: OperationsIncidentStatus,
	to: OperationsIncidentStatus,
	options?: { hasRunbookAttached: boolean },
): boolean {
	if (from === to) {
		return true;
	}
	if (!ALLOWED_TRANSITIONS[from].includes(to)) {
		return false;
	}
	if (to === "MITIGATING" && !options?.hasRunbookAttached) {
		return false;
	}
	return true;
}

export function isTerminalIncidentStatus(
	status: OperationsIncidentStatus,
): boolean {
	return TERMINAL_STATUSES.has(status);
}

export function requiresRunbookForStatus(
	status: OperationsIncidentStatus,
): boolean {
	return status === "MITIGATING";
}
