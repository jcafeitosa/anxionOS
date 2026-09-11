import type {
	CancelRecoveryTaskCommand,
	OperationsCommandResult,
	OperationsRecoveryTaskStatus,
} from "@anxionos/contracts/operations";
import { cancelRecoveryTaskCommandSchema } from "@anxionos/contracts/operations";
import { createRecoveryTaskCancelledEvent } from "../../domain/events/operations-events";
import {
	type RecoveryTaskTerminalCommandDeps,
	transitionRecoveryTaskToTerminalStatus,
} from "./recovery-task-terminal-support";

export type CancelRecoveryTaskDeps = RecoveryTaskTerminalCommandDeps;

const CANCEL_SOURCE_STATUSES = new Set<OperationsRecoveryTaskStatus>([
	"PENDING",
	"AWAITING_APPROVAL",
	"APPROVED",
	"IN_PROGRESS",
]);

export async function cancelRecoveryTask(
	deps: CancelRecoveryTaskDeps,
	input: CancelRecoveryTaskCommand,
): Promise<OperationsCommandResult> {
	const command = cancelRecoveryTaskCommandSchema.parse(input);
	return transitionRecoveryTaskToTerminalStatus(deps, command, {
		commandName: "cancelRecoveryTask",
		toStatus: "CANCELLED",
		allowedFromStatuses: CANCEL_SOURCE_STATUSES,
		createEvent: (eventInput) =>
			createRecoveryTaskCancelledEvent({
				recoveryTaskId: eventInput.recoveryTaskId,
				organizationId: eventInput.organizationId,
				incidentId: eventInput.incidentId,
				fromStatus: eventInput.fromStatus,
				toStatus: "CANCELLED",
				stepKind: eventInput.stepKind,
				revision: eventInput.revision,
				cancelledAt: eventInput.occurredAt,
				cancelReason: command.cancelReason,
				cancelledByPrincipalId: command.cancelledByPrincipalId,
			}),
	});
}
