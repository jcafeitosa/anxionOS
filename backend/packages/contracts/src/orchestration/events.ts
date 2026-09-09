import { z } from "zod";
import { gateBindingV1Schema } from "./gate-binding/1.0.0/schema";
import { agentIdSchema, checkoutStatusSchema, goalIdSchema, hierarchyModeSchema, issueIdentifierSchema, organizationIdSchema, runIdSchema, taskIdSchema, } from "./types";
export const ORCHESTRATION_OWNER_DOMAIN = "orchestration";
export const ORCHESTRATION_EVENT_TYPES = {
    TASK_CHECKED_OUT: "orchestration.task.checked_out.v1",
    TASK_LEASE_RELEASED: "orchestration.task.lease_released.v1",
    TASK_LEASE_RENEWED: "orchestration.task.lease_renewed.v1",
    RUN_ORPHANED: "orchestration.run.orphaned.v1",
    GATE_DISPOSITION_RECORDED: "orchestration.gate.disposition.recorded.v1",
    PLAN_REVISION_PROPOSED: "orchestration.plan.revision.proposed.v1",
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
    reason: z.enum(["board_in_review", "manual", "gate_blocked", "ttl_expired"]),
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
    bindingId: z.string().uuid(),
    organizationId: organizationIdSchema,
    issueIdentifier: issueIdentifierSchema,
    gateBinding: gateBindingV1Schema,
    hierarchyMode: hierarchyModeSchema,
    invalidatedPriorCount: z.number().int().nonnegative(),
});
export const orchestrationPlanRevisionProposedV1PayloadSchema = z.object({
    planRevisionId: z.string().uuid(),
    goalId: goalIdSchema,
    proposedByAgentId: agentIdSchema,
    requiresG0Rebind: z.boolean(),
});
export const orchestrationEventPayloadSchemas = {
    [ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT]: orchestrationTaskCheckedOutV1PayloadSchema,
    [ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED]: orchestrationTaskLeaseReleasedV1PayloadSchema,
    [ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED]: orchestrationTaskLeaseRenewedV1PayloadSchema,
    [ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED]: orchestrationRunOrphanedV1PayloadSchema,
    [ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED]: orchestrationGateDispositionRecordedV1PayloadSchema,
    [ORCHESTRATION_EVENT_TYPES.PLAN_REVISION_PROPOSED]: orchestrationPlanRevisionProposedV1PayloadSchema,
};
export const orchestrationEventPayloadSchema = z.discriminatedUnion("eventType", [
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
]);

export type OrchestrationEventType = (typeof ORCHESTRATION_EVENT_TYPES)[keyof typeof ORCHESTRATION_EVENT_TYPES];

export type OrchestrationTaskCheckedOutV1Payload = z.infer<typeof orchestrationTaskCheckedOutV1PayloadSchema>;
export type OrchestrationTaskLeaseReleasedV1Payload = z.infer<typeof orchestrationTaskLeaseReleasedV1PayloadSchema>;
export type OrchestrationTaskLeaseRenewedV1Payload = z.infer<typeof orchestrationTaskLeaseRenewedV1PayloadSchema>;
export type OrchestrationRunOrphanedV1Payload = z.infer<typeof orchestrationRunOrphanedV1PayloadSchema>;
export type OrchestrationGateDispositionRecordedV1Payload = z.infer<typeof orchestrationGateDispositionRecordedV1PayloadSchema>;
export type OrchestrationPlanRevisionProposedV1Payload = z.infer<typeof orchestrationPlanRevisionProposedV1PayloadSchema>;
