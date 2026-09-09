import { z } from "zod";
import { gateBindingV1ObjectSchema, refineGateBindingDigestRules, } from "./gate-binding/1.0.0/schema";
import { agentIdSchema, goalIdSchema, issueIdentifierSchema, organizationIdSchema, runIdSchema, taskIdSchema, } from "./types";
export const checkoutTaskCommandSchema = z.object({
    taskId: taskIdSchema,
    agentId: agentIdSchema,
    organizationId: organizationIdSchema,
    leaseTtlMs: z.number().int().min(60_000).max(28_800_000).optional(),
});
export const renewTaskLeaseCommandSchema = z.object({
    taskId: taskIdSchema,
    agentId: agentIdSchema,
    leaseToken: z.string().uuid(),
});
export const releaseTaskLeaseCommandSchema = z.object({
    taskId: taskIdSchema,
    agentId: agentIdSchema,
    leaseToken: z.string().uuid(),
    reason: z.enum(["board_in_review", "manual", "gate_blocked"]).optional(),
});
export const recordGateDispositionCommandSchema = gateBindingV1ObjectSchema
    .omit({
    schemaVersion: true,
    recordedAt: true,
    invalidatedAt: true,
})
    .extend({
    organizationId: organizationIdSchema,
})
    .superRefine(refineGateBindingDigestRules);
export const proposePlanRevisionCommandSchema = z.object({
    goalId: goalIdSchema,
    organizationId: organizationIdSchema,
    proposedByAgentId: agentIdSchema,
    rationale: z.string().min(1).max(4000),
    requiresG0Rebind: z.boolean().default(true),
});
export const recordRunHeartbeatCommandSchema = z.object({
    runId: runIdSchema,
    taskId: taskIdSchema,
    agentId: agentIdSchema,
    organizationId: organizationIdSchema,
});
export const dequeueRunHeartbeatsCommandSchema = z.object({
    limit: z.number().int().min(1).max(500).default(50),
});
export const acknowledgeRunHeartbeatCommandSchema = z.object({
    heartbeatId: z.string().uuid(),
});
export const sweepExpiredLeasesCommandSchema = z.object({
    batchSize: z.number().int().min(1).max(100).default(100),
});
export const ingestTaskboardWebhookCommandSchema = z.object({
    issueIdentifier: issueIdentifierSchema,
    status: z.enum(["todo", "in_progress", "in_review", "blocked", "done"]),
    boardVersion: z.number().int().nonnegative(),
    threadId: z.string().max(128).optional(),
    occurredAt: z.string().datetime(),
    signature: z.string().optional(),
});

export type CheckoutTaskCommand = z.infer<typeof checkoutTaskCommandSchema>;
export type RenewTaskLeaseCommand = z.infer<typeof renewTaskLeaseCommandSchema>;
export type ReleaseTaskLeaseCommand = z.infer<typeof releaseTaskLeaseCommandSchema>;
export type RecordGateDispositionCommand = z.infer<typeof recordGateDispositionCommandSchema>;
export type ProposePlanRevisionCommand = z.infer<typeof proposePlanRevisionCommandSchema>;
export type IngestTaskboardWebhookCommand = z.infer<typeof ingestTaskboardWebhookCommandSchema>;
export type RecordRunHeartbeatCommand = z.infer<typeof recordRunHeartbeatCommandSchema>;
export type DequeueRunHeartbeatsCommand = z.infer<typeof dequeueRunHeartbeatsCommandSchema>;
export type AcknowledgeRunHeartbeatCommand = z.infer<typeof acknowledgeRunHeartbeatCommandSchema>;
export type SweepExpiredLeasesCommand = z.infer<typeof sweepExpiredLeasesCommandSchema>;
