import { z } from "zod";
import { gateBindingV1Schema } from "./gate-binding/1.0.0/schema";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	agentIdSchema,
	checkoutStatusSchema,
	goalIdSchema,
	hierarchyModeSchema,
	issueIdentifierSchema,
	organizationIdSchema,
	runIdSchema,
	taskIdSchema,
} from "./types";
export const ORCHESTRATION_OWNER_DOMAIN = "orchestration";
export const ORCHESTRATION_EVENT_TYPES = {
	TASK_CHECKED_OUT: "orchestration.task.checked_out.v1",
	TASK_LEASE_RELEASED: "orchestration.task.lease_released.v1",
	TASK_LEASE_RENEWED: "orchestration.task.lease_renewed.v1",
	RUN_ORPHANED: "orchestration.run.orphaned.v1",
	GATE_DISPOSITION_RECORDED: "orchestration.gate.disposition.recorded.v1",
	PLAN_REVISION_PROPOSED: "orchestration.plan.revision.proposed.v1",
	RUN_WAITING_HUMAN_REQUESTED: "orchestration.run.waiting_human_requested.v1",
	RUN_RESUMED_FROM_HUMAN: "orchestration.run.resumed_from_human.v1",
	RUN_TERMINATED: "orchestration.run.terminated.v1",
	RUN_RESTARTED_FROM_CHECKPOINT: "orchestration.run.restarted_from_checkpoint.v1",
	RUN_BUDGET_STOPPED: "orchestration.run.budget_stopped.v1",
};
export const orchestrationTaskCheckedOutV1PayloadSchema = z.object({
	taskId: taskIdSchema,
	runId: runIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	goalId: goalIdSchema,
	goalAncestry: z.array(goalIdSchema).min(1),
	leaseExpiresAt: z.string().datetime(),
	checkoutStatus: checkoutStatusSchema,
	idempotentReplay: z.boolean(),
});
export const orchestrationTaskLeaseReleasedV1PayloadSchema = z.object({
	taskId: taskIdSchema,
	runId: runIdSchema.optional(),
	agentId: agentIdSchema,
	issueIdentifier: issueIdentifierSchema,
	reason: z.enum(["board_in_review", "manual", "gate_blocked", "ttl_expired", "cancelled", "budget_exceeded"]),
});
export const orchestrationTaskLeaseRenewedV1PayloadSchema = z.object({
	taskId: taskIdSchema,
	runId: runIdSchema,
	agentId: agentIdSchema,
	leaseExpiresAt: z.string().datetime(),
});
export const orchestrationRunOrphanedV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	issueIdentifier: issueIdentifierSchema,
	previousStatus: z.string(),
});
export const orchestrationGateDispositionRecordedV1PayloadSchema = z.object({
	bindingId: institutionalUuidSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	gateBinding: gateBindingV1Schema,
	hierarchyMode: hierarchyModeSchema,
	invalidatedPriorCount: z.number().int().nonnegative(),
});
export const orchestrationRunWaitingHumanRequestedV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	operationId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(256),
	runRevision: z.number().int().positive(),
});
export const orchestrationRunTerminatedV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	runRevision: z.number().int().positive(),
	reason: z.string().optional(),
	idempotentReplay: z.boolean(),
});
export const orchestrationRunResumedFromHumanV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	operationId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(256),
	runRevision: z.number().int().positive(),
	idempotentReplay: z.boolean(),
});
export const orchestrationRunRestartedFromCheckpointV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	runRevision: z.number().int().positive(),
	checkpointRevision: z.number().int().positive(),
	idempotencyKey: z.string().min(1).max(256),
	idempotentReplay: z.boolean(),
});
export const orchestrationRunBudgetStoppedV1PayloadSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	issueIdentifier: issueIdentifierSchema,
	runRevision: z.number().int().positive(),
	cancelledHeartbeats: z.number().int().nonnegative(),
	idempotentReplay: z.boolean(),
});
export const orchestrationPlanRevisionProposedV1PayloadSchema = z.object({
	planRevisionId: institutionalUuidSchema,
	goalId: goalIdSchema,
	proposedByAgentId: agentIdSchema,
	requiresG0Rebind: z.boolean(),
});
export const orchestrationEventPayloadSchemas = {
	[ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT]:
		orchestrationTaskCheckedOutV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED]:
		orchestrationTaskLeaseReleasedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED]:
		orchestrationTaskLeaseRenewedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED]:
		orchestrationRunOrphanedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED]:
		orchestrationGateDispositionRecordedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.PLAN_REVISION_PROPOSED]:
		orchestrationPlanRevisionProposedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_WAITING_HUMAN_REQUESTED]:
		orchestrationRunWaitingHumanRequestedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_RESUMED_FROM_HUMAN]:
		orchestrationRunResumedFromHumanV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_TERMINATED]:
		orchestrationRunTerminatedV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_RESTARTED_FROM_CHECKPOINT]:
		orchestrationRunRestartedFromCheckpointV1PayloadSchema,
	[ORCHESTRATION_EVENT_TYPES.RUN_BUDGET_STOPPED]:
		orchestrationRunBudgetStoppedV1PayloadSchema,
};
export const orchestrationEventPayloadSchema = z.discriminatedUnion(
	"eventType",
	[
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT),
			payload: orchestrationTaskCheckedOutV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED),
			payload: orchestrationTaskLeaseReleasedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED),
			payload: orchestrationTaskLeaseRenewedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED),
			payload: orchestrationRunOrphanedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED),
			payload: orchestrationGateDispositionRecordedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.PLAN_REVISION_PROPOSED),
			payload: orchestrationPlanRevisionProposedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.RUN_WAITING_HUMAN_REQUESTED),
			payload: orchestrationRunWaitingHumanRequestedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.RUN_RESUMED_FROM_HUMAN),
			payload: orchestrationRunResumedFromHumanV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.RUN_TERMINATED),
			payload: orchestrationRunTerminatedV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(
				ORCHESTRATION_EVENT_TYPES.RUN_RESTARTED_FROM_CHECKPOINT,
			),
			payload: orchestrationRunRestartedFromCheckpointV1PayloadSchema,
		}),
		z.object({
			eventType: z.literal(ORCHESTRATION_EVENT_TYPES.RUN_BUDGET_STOPPED),
			payload: orchestrationRunBudgetStoppedV1PayloadSchema,
		}),
	],
);

export type OrchestrationEventType =
	(typeof ORCHESTRATION_EVENT_TYPES)[keyof typeof ORCHESTRATION_EVENT_TYPES];

export type OrchestrationTaskCheckedOutV1Payload = z.infer<
	typeof orchestrationTaskCheckedOutV1PayloadSchema
>;
export type OrchestrationTaskLeaseReleasedV1Payload = z.infer<
	typeof orchestrationTaskLeaseReleasedV1PayloadSchema
>;
export type OrchestrationTaskLeaseRenewedV1Payload = z.infer<
	typeof orchestrationTaskLeaseRenewedV1PayloadSchema
>;
export type OrchestrationRunOrphanedV1Payload = z.infer<
	typeof orchestrationRunOrphanedV1PayloadSchema
>;
export type OrchestrationGateDispositionRecordedV1Payload = z.infer<
	typeof orchestrationGateDispositionRecordedV1PayloadSchema
>;
export type OrchestrationPlanRevisionProposedV1Payload = z.infer<
	typeof orchestrationPlanRevisionProposedV1PayloadSchema
>;

export type OrchestrationRunWaitingHumanRequestedV1Payload = z.infer<
	typeof orchestrationRunWaitingHumanRequestedV1PayloadSchema
>;
export type OrchestrationRunResumedFromHumanV1Payload = z.infer<
	typeof orchestrationRunResumedFromHumanV1PayloadSchema
>;

export type OrchestrationRunTerminatedV1Payload = z.infer<
	typeof orchestrationRunTerminatedV1PayloadSchema
>;
export type OrchestrationRunRestartedFromCheckpointV1Payload = z.infer<
	typeof orchestrationRunRestartedFromCheckpointV1PayloadSchema
>;
export type OrchestrationRunBudgetStoppedV1Payload = z.infer<
	typeof orchestrationRunBudgetStoppedV1PayloadSchema
>;
