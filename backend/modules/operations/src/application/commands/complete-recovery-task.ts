import type {
	CompleteRecoveryTaskCommand,
	OperationsCommandResult,
} from "@anxionos/contracts/operations";
import { completeRecoveryTaskCommandSchema } from "@anxionos/contracts/operations";
import { createRecoveryTaskCompletedEvent } from "../../domain/events/operations-events";
import {
	type RecoveryTaskTerminalCommandDeps,
	transitionRecoveryTaskToTerminalStatus,
} from "./recovery-task-terminal-support";

export type CompleteRecoveryTaskDeps = RecoveryTaskTerminalCommandDeps;

const COMPLETE_SOURCE_STATUSES = new Set(["IN_PROGRESS"] as const);

export async function completeRecoveryTask(
	deps: CompleteRecoveryTaskDeps,
	input: CompleteRecoveryTaskCommand,
): Promise<OperationsCommandResult> {
	const command = completeRecoveryTaskCommandSchema.parse(input);
	return transitionRecoveryTaskToTerminalStatus(deps, command, {
		commandName: "completeRecoveryTask",
		toStatus: "COMPLETED",
		allowedFromStatuses: COMPLETE_SOURCE_STATUSES,
		createEvent: (eventInput) =>
			createRecoveryTaskCompletedEvent({
				recoveryTaskId: eventInput.recoveryTaskId,
				organizationId: eventInput.organizationId,
				incidentId: eventInput.incidentId,
				fromStatus: "IN_PROGRESS",
				toStatus: "COMPLETED",
				stepKind: eventInput.stepKind,
				revision: eventInput.revision,
				completedAt: eventInput.occurredAt,
				completedByPrincipalId: command.completedByPrincipalId,
			}),
	});
}
