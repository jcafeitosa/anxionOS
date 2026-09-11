import type {
	FailRecoveryTaskCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import { failRecoveryTaskCommandSchema } from "@anxionos/contracts/operations";
import { createRecoveryTaskFailedEvent } from "../../domain/events/operations-events";
import {
	type RecoveryTaskTerminalCommandDeps,
	transitionRecoveryTaskToTerminalStatus,
} from "./recovery-task-terminal-support";

export type FailRecoveryTaskDeps = RecoveryTaskTerminalCommandDeps;

const FAIL_SOURCE_STATUSES = new Set(["IN_PROGRESS"] as const);

export async function failRecoveryTask(
	deps: FailRecoveryTaskDeps,
	input: FailRecoveryTaskCommand,
): Promise<OperationsCommandResult> {
	const command = failRecoveryTaskCommandSchema.parse(input);
	return transitionRecoveryTaskToTerminalStatus(deps, command, {
		commandName: "failRecoveryTask",
		toStatus: "FAILED",
		allowedFromStatuses: FAIL_SOURCE_STATUSES,
		createEvent: (eventInput) =>
			createRecoveryTaskFailedEvent({
				recoveryTaskId: eventInput.recoveryTaskId,
				organizationId: eventInput.organizationId,
				incidentId: eventInput.incidentId,
				fromStatus: "IN_PROGRESS",
				toStatus: "FAILED",
				stepKind: eventInput.stepKind,
				revision: eventInput.revision,
				failedAt: eventInput.occurredAt,
				failureReason: command.failureReason,
				failedByPrincipalId: command.failedByPrincipalId,
			}),
	});
}
