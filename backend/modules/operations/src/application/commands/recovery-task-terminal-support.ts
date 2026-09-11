import type {
	OperationsCommandResult,
	OperationsRecoveryTaskStatus,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	operationsRecoveryStepKindSchema,
} from "@anxionos/contracts/operations";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { RecoveryTaskRevisionConflictError } from "../../domain/errors/recovery-errors";
import {
	canTransitionRecoveryTaskStatus,
	isTerminalRecoveryTaskStatus,
} from "../../domain/recovery-lifecycle";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface RecoveryTaskTerminalCommandDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
	now?: () => string;
}

type RecoveryTaskTerminalTransitionInput = {
	commandId: string;
	organizationId: string;
	recoveryTaskId: string;
	expectedRevision: number;
};

type RecoveryTaskTerminalTransitionOptions = {
	commandName: string;
	toStatus: OperationsRecoveryTaskStatus;
	allowedFromStatuses: ReadonlySet<OperationsRecoveryTaskStatus>;
	createEvent: (input: {
		recoveryTaskId: string;
		organizationId: string;
		incidentId: string;
		fromStatus: OperationsRecoveryTaskStatus;
		toStatus: OperationsRecoveryTaskStatus;
		stepKind: string;
		revision: number;
		occurredAt: string;
	}) => DomainEventEnvelope;
};

export async function transitionRecoveryTaskToTerminalStatus(
	deps: RecoveryTaskTerminalCommandDeps,
	command: RecoveryTaskTerminalTransitionInput,
	options: RecoveryTaskTerminalTransitionOptions,
): Promise<OperationsCommandResult> {
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
		const toStatus = options.toStatus;
		if (isTerminalRecoveryTaskStatus(fromStatus)) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				"recovery task is in terminal status",
			);
		}
		if (!options.allowedFromStatuses.has(fromStatus)) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				`cannot transition recovery task from ${fromStatus} to ${toStatus}`,
			);
		}

		const transitionOptions = {
			stepRequiresApproval: recoveryTask.stepRequiresApproval,
			hasRequiredApproval: recoveryTask.hasRequiredApproval,
		};
		if (
			!canTransitionRecoveryTaskStatus(fromStatus, toStatus, transitionOptions)
		) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				`cannot transition recovery task from ${fromStatus} to ${toStatus}`,
			);
		}

		const stepKind = operationsRecoveryStepKindSchema.parse(
			recoveryTask.stepKind,
		);
		const occurredAt = deps.now?.() ?? new Date().toISOString();
		const nextRevision = recoveryTask.revision + 1;
		let updated;
		try {
			updated = await ctx.recoveryTasks.update({
				...recoveryTask,
				status: toStatus,
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
			options.createEvent({
				recoveryTaskId: updated.id,
				organizationId: updated.organizationId,
				incidentId: updated.incidentId,
				fromStatus,
				toStatus,
				stepKind,
				revision: updated.revision,
				occurredAt,
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
			commandName: options.commandName,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
