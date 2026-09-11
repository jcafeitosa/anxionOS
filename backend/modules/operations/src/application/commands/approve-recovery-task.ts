import type {
	ApproveRecoveryTaskCommand,
	OperationsCommandResult,
	OperationsRecoveryTaskStatus,
} from "@anxionos/contracts/operations";
import {
	approveRecoveryTaskCommandSchema,
	operationsCommandResultSchema,
	operationsRecoveryStepKindSchema,
} from "@anxionos/contracts/operations";
import { RecoveryTaskRevisionConflictError } from "../../domain/errors/recovery-errors";
import { createRecoveryTaskApprovedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	canTransitionRecoveryTaskStatus,
	isTerminalRecoveryTaskStatus,
} from "../../domain/recovery-lifecycle";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface ApproveRecoveryTaskDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
	now?: () => string;
}

export async function approveRecoveryTask(
	deps: ApproveRecoveryTaskDeps,
	input: ApproveRecoveryTaskCommand,
): Promise<OperationsCommandResult> {
	const command = approveRecoveryTaskCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwOperationsError(
			"OPS_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			if (raced.organizationId !== command.organizationId) {
				throwOperationsError(
					"OPS_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return operationsCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const recoveryTask = await ctx.recoveryTasks.findById(
			command.recoveryTaskId,
		);
		if (!recoveryTask) {
			throwOperationsError(
				"OPS_RECOVERY_TASK_NOT_FOUND",
				"recovery task not found",
			);
		}
		if (recoveryTask.organizationId !== command.organizationId) {
			throwOperationsError(
				"OPS_CROSS_TENANT",
				"recovery task organization mismatch",
			);
		}
		if (recoveryTask.revision !== command.expectedRevision) {
			throwOperationsError(
				"OPS_REVISION_CONFLICT",
				"recovery task revision conflict",
			);
		}

		const fromStatus = recoveryTask.status as OperationsRecoveryTaskStatus;
		const toStatus: OperationsRecoveryTaskStatus = "APPROVED";
		if (isTerminalRecoveryTaskStatus(fromStatus)) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				"recovery task is in terminal status",
			);
		}
		if (fromStatus !== "AWAITING_APPROVAL") {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				`cannot approve recovery task from ${fromStatus}`,
			);
		}
		if (!recoveryTask.stepRequiresApproval) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				"recovery task does not require approval",
			);
		}

		if (
			!canTransitionRecoveryTaskStatus(fromStatus, toStatus, {
				stepRequiresApproval: recoveryTask.stepRequiresApproval,
				hasRequiredApproval: true,
			})
		) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				`cannot transition recovery task from ${fromStatus} to ${toStatus}`,
			);
		}

		const stepKind = operationsRecoveryStepKindSchema.parse(
			recoveryTask.stepKind,
		);
		const approvedAt = deps.now?.() ?? new Date().toISOString();
		const nextRevision = recoveryTask.revision + 1;
		let updated;
		try {
			updated = await ctx.recoveryTasks.update({
				...recoveryTask,
				status: toStatus,
				hasRequiredApproval: true,
				revision: nextRevision,
				expectedRevision: recoveryTask.revision,
			});
		} catch (error) {
			if (error instanceof RecoveryTaskRevisionConflictError) {
				throwOperationsError(
					"OPS_REVISION_CONFLICT",
					"recovery task revision conflict",
				);
			}
			throw error;
		}

		await ctx.publishEvents([
			createRecoveryTaskApprovedEvent({
				recoveryTaskId: updated.id,
				organizationId: updated.organizationId,
				incidentId: updated.incidentId,
				fromStatus,
				toStatus,
				stepKind,
				hasRequiredApproval: true,
				revision: updated.revision,
				approvedAt,
				approvedByPrincipalId: command.approvedByPrincipalId,
			}),
		]);

		const result = operationsCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			incidentId: updated.incidentId,
			recoveryTaskId: updated.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "approveRecoveryTask",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
