import {
	operationsRecoveryStepKindSchema,
	type OperationsRecoveryStepKind,
	type OperationsRecoveryTaskStatus,
} from "@anxionos/contracts/operations";

const ALLOWED_TRANSITIONS: Record<
	OperationsRecoveryTaskStatus,
	readonly OperationsRecoveryTaskStatus[]
> = {
	PENDING: ["AWAITING_APPROVAL", "APPROVED", "IN_PROGRESS", "CANCELLED"],
	AWAITING_APPROVAL: ["APPROVED", "CANCELLED"],
	APPROVED: ["IN_PROGRESS", "CANCELLED"],
	IN_PROGRESS: ["COMPLETED", "FAILED", "CANCELLED"],
	COMPLETED: [],
	FAILED: [],
	CANCELLED: [],
};

const TERMINAL_STATUSES: ReadonlySet<OperationsRecoveryTaskStatus> = new Set([
	"COMPLETED",
	"FAILED",
	"CANCELLED",
]);

const DANGEROUS_STEP_KINDS: ReadonlySet<OperationsRecoveryStepKind> = new Set([
	"RESTORE_DATABASE",
	"REPLAY_OUTBOX",
	"REBUILD_PROJECTION",
	"PURGE_QUEUE",
]);

const ALLOWED_RECOVERY_STEP_KINDS: ReadonlySet<string> = new Set(
	operationsRecoveryStepKindSchema.options,
);

export type RecoveryTaskTransitionOptions = {
	hasRequiredApproval?: boolean;
	stepRequiresApproval?: boolean;
};

function recoveryTransitionAdvancesExecution(
	to: OperationsRecoveryTaskStatus,
): boolean {
	return to === "APPROVED" || to === "IN_PROGRESS";
}

export function canTransitionRecoveryTaskStatus(
	from: OperationsRecoveryTaskStatus,
	to: OperationsRecoveryTaskStatus,
	options?: RecoveryTaskTransitionOptions,
): boolean {
	if (from === to) {
		return true;
	}
	if (!ALLOWED_TRANSITIONS[from].includes(to)) {
		return false;
	}
	if (
		options?.stepRequiresApproval === true &&
		recoveryTransitionAdvancesExecution(to)
	) {
		return options.hasRequiredApproval === true;
	}
	return true;
}

export function isTerminalRecoveryTaskStatus(
	status: OperationsRecoveryTaskStatus,
): boolean {
	return TERMINAL_STATUSES.has(status);
}

export function requiresApprovalForRecoveryStep(
	stepKind: OperationsRecoveryStepKind,
): boolean {
	return DANGEROUS_STEP_KINDS.has(stepKind);
}

export function isAllowedRecoveryStepKind(stepKind: string): boolean {
	if (
		stepKind.toUpperCase().includes("LLM") ||
		stepKind.toUpperCase().includes("INFERENCE")
	) {
		return false;
	}
	return ALLOWED_RECOVERY_STEP_KINDS.has(stepKind);
}

export function resolveInitialRecoveryTaskStatus(
	stepKind: OperationsRecoveryStepKind,
): OperationsRecoveryTaskStatus {
	return requiresApprovalForRecoveryStep(stepKind)
		? "AWAITING_APPROVAL"
		: "PENDING";
}
