import { randomUUID } from "node:crypto";
import type {
	OperationsCommandResult,
	OperationsRecoveryStepKind,
	OperationsRecoveryTaskStatus,
	StartRecoveryTaskCommand,
} from "@anxionos/contracts/operations";
import {
	operationsCommandResultSchema,
	operationsRecoveryStepKindSchema,
	startRecoveryTaskCommandSchema,
} from "@anxionos/contracts/operations";
import { createRecoveryTaskStartedEvent } from "../../domain/events/operations-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OperationsUnitOfWork } from "../../domain/ports/operations-unit-of-work";
import {
	canTransitionRecoveryTaskStatus,
	isAllowedRecoveryStepKind,
	requiresApprovalForRecoveryStep,
	resolveInitialRecoveryTaskStatus,
} from "../../domain/recovery-lifecycle";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwOperationsError } from "../errors";

export interface StartRecoveryTaskDeps {
	unitOfWork: OperationsUnitOfWork;
	commandJournal: CommandJournalRepository;
	now?: () => string;
}

function resolveRecoveryTaskStatus(
	stepKind: OperationsRecoveryStepKind,
	hasRequiredApproval: boolean,
): OperationsRecoveryTaskStatus {
	const stepRequiresApproval = requiresApprovalForRecoveryStep(stepKind);
	let status = resolveInitialRecoveryTaskStatus(stepKind);

	if (hasRequiredApproval && stepRequiresApproval) {
		const targetStatus: OperationsRecoveryTaskStatus = "APPROVED";
		if (
			!canTransitionRecoveryTaskStatus(status, targetStatus, {
				stepRequiresApproval: true,
				hasRequiredApproval: true,
			})
		) {
			throwOperationsError(
				"OPS_RECOVERY_STATUS_INVALID",
				`cannot start recovery task at ${targetStatus} for step ${stepKind}`,
			);
		}
		status = targetStatus;
	}

	return status;
}

export async function startRecoveryTask(
	deps: StartRecoveryTaskDeps,
	input: StartRecoveryTaskCommand,
): Promise<OperationsCommandResult> {
	const command = startRecoveryTaskCommandSchema.parse(input);
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

	if (!isAllowedRecoveryStepKind(command.stepKind)) {
		throwOperationsError(
			"OPS_RECOVERY_STEP_KIND_REJECTED",
			`recovery step kind rejected: ${command.stepKind}`,
		);
	}

	const stepKind = operationsRecoveryStepKindSchema.parse(command.stepKind);
	const hasRequiredApproval = command.hasRequiredApproval === true;
	const stepRequiresApproval = requiresApprovalForRecoveryStep(stepKind);
	const status = resolveRecoveryTaskStatus(stepKind, hasRequiredApproval);

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

		const incident = await ctx.incidents.findById(command.incidentId);
		if (!incident) {
			throwOperationsError("OPS_INCIDENT_NOT_FOUND", "incident not found");
		}
		if (incident.organizationId !== command.organizationId) {
			throwOperationsError(
				"OPS_CROSS_TENANT",
				"incident organization mismatch",
			);
		}

		const recoveryTaskId = `ops_rcv_${randomUUID()}`;
		const startedAt = deps.now?.() ?? new Date().toISOString();
		const saved = await ctx.recoveryTasks.save({
			id: recoveryTaskId,
			organizationId: command.organizationId,
			incidentId: command.incidentId,
			stepKind,
			status,
			stepRequiresApproval,
			hasRequiredApproval,
			startedAt,
			revision: 1,
			initiatedByPrincipalId: command.initiatedByPrincipalId ?? null,
		});

		await ctx.publishEvents([
			createRecoveryTaskStartedEvent({
				recoveryTaskId: saved.id,
				organizationId: saved.organizationId,
				incidentId: saved.incidentId,
				stepKind: saved.stepKind,
				status: saved.status,
				stepRequiresApproval: saved.stepRequiresApproval,
				hasRequiredApproval: saved.hasRequiredApproval,
				startedAt: saved.startedAt,
				revision: saved.revision,
				initiatedByPrincipalId: command.initiatedByPrincipalId,
			}),
		]);

		const result = operationsCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: 1,
			incidentId: saved.incidentId,
			recoveryTaskId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "startRecoveryTask",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
