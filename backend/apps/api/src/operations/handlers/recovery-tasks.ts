import {
	approveRecoveryTaskCommandSchema,
	cancelRecoveryTaskCommandSchema,
	completeRecoveryTaskCommandSchema,
	failRecoveryTaskCommandSchema,
	operationsRecoveryTaskIdSchema,
	startRecoveryTaskCommandSchema,
	startRecoveryTaskExecutionCommandSchema,
} from "@anxionos/contracts/operations";
import {
	approveRecoveryTask,
	cancelRecoveryTask,
	completeRecoveryTask,
	failRecoveryTask,
	startRecoveryTask,
	startRecoveryTaskExecution,
} from "@anxionos/operations";
import { z } from "zod";
import { incidentIdParamSchema } from "./incidents";
import type { OperationsPluginDeps } from "../plugin";

export { incidentIdParamSchema };

const startRecoveryTaskBodySchema = startRecoveryTaskCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		incidentId: true,
		initiatedByPrincipalId: true,
	})
	.strict();

const approveRecoveryTaskBodySchema = approveRecoveryTaskCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		recoveryTaskId: true,
		approvedByPrincipalId: true,
	})
	.strict();

const startRecoveryTaskExecutionBodySchema =
	startRecoveryTaskExecutionCommandSchema
		.omit({
			commandId: true,
			organizationId: true,
			recoveryTaskId: true,
		})
		.strict();

const completeRecoveryTaskBodySchema = completeRecoveryTaskCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		recoveryTaskId: true,
		completedByPrincipalId: true,
	})
	.strict();

const failRecoveryTaskBodySchema = failRecoveryTaskCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		recoveryTaskId: true,
		failedByPrincipalId: true,
	})
	.strict();

const cancelRecoveryTaskBodySchema = cancelRecoveryTaskCommandSchema
	.omit({
		commandId: true,
		organizationId: true,
		recoveryTaskId: true,
		cancelledByPrincipalId: true,
	})
	.strict();

export const recoveryTaskIdParamSchema = z.object({
	recoveryTaskId: operationsRecoveryTaskIdSchema,
});

export async function handleStartRecoveryTask(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		incidentId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = startRecoveryTaskBodySchema.parse(input.body);
	return startRecoveryTask(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			incidentId: input.incidentId,
			stepKind: body.stepKind,
			hasRequiredApproval: body.hasRequiredApproval,
			initiatedByPrincipalId: input.principalId,
		},
	);
}

export async function handleApproveRecoveryTask(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		recoveryTaskId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = approveRecoveryTaskBodySchema.parse(input.body);
	return approveRecoveryTask(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			recoveryTaskId: input.recoveryTaskId,
			expectedRevision: body.expectedRevision,
			approvedByPrincipalId: input.principalId,
		},
	);
}

export async function handleStartRecoveryTaskExecution(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		recoveryTaskId: string;
		body: unknown;
	},
) {
	const body = startRecoveryTaskExecutionBodySchema.parse(input.body);
	return startRecoveryTaskExecution(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			recoveryTaskId: input.recoveryTaskId,
			expectedRevision: body.expectedRevision,
		},
	);
}

export async function handleCompleteRecoveryTask(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		recoveryTaskId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = completeRecoveryTaskBodySchema.parse(input.body);
	return completeRecoveryTask(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			recoveryTaskId: input.recoveryTaskId,
			expectedRevision: body.expectedRevision,
			completedByPrincipalId: input.principalId,
		},
	);
}

export async function handleFailRecoveryTask(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		recoveryTaskId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = failRecoveryTaskBodySchema.parse(input.body);
	return failRecoveryTask(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			recoveryTaskId: input.recoveryTaskId,
			expectedRevision: body.expectedRevision,
			failureReason: body.failureReason,
			failedByPrincipalId: input.principalId,
		},
	);
}

export async function handleCancelRecoveryTask(
	deps: OperationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		recoveryTaskId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = cancelRecoveryTaskBodySchema.parse(input.body);
	return cancelRecoveryTask(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			recoveryTaskId: input.recoveryTaskId,
			expectedRevision: body.expectedRevision,
			cancelReason: body.cancelReason,
			cancelledByPrincipalId: input.principalId,
		},
	);
}
