import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	gateBindingV1ObjectSchema,
	refineGateBindingDigestRules,
} from "./gate-binding/1.0.0/schema";
import {
	agentIdSchema,
	goalIdSchema,
	issueIdentifierSchema,
	organizationIdSchema,
	runIdSchema,
	runStatusSchema,
	taskIdSchema,
} from "./types";
export const checkoutTaskCommandSchema = z.object({
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	organizationId: organizationIdSchema,
	leaseTtlMs: z.number().int().min(60_000).max(28_800_000).optional(),
});
export const renewTaskLeaseCommandSchema = z.object({
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	leaseToken: institutionalUuidSchema,
});
export const releaseTaskLeaseCommandSchema = z.object({
	taskId: taskIdSchema,
	agentId: agentIdSchema,
	leaseToken: institutionalUuidSchema,
	reason: z
		.enum([
			"board_in_review",
			"manual",
			"gate_blocked",
			"cancelled",
			"budget_exceeded",
		])
		.optional(),
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
	heartbeatId: institutionalUuidSchema,
});
export const requestWaitingHumanInputCommandSchema = z.object({
	runId: runIdSchema,
	organizationId: organizationIdSchema,
	operationId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(256),
	reason: z.string().min(1).max(2000).optional(),
});
export const resumeFromWaitingHumanInputCommandSchema = z.object({
	runId: runIdSchema,
	organizationId: organizationIdSchema,
	operationId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(256),
});
export const restartRunFromCheckpointCommandSchema = z.object({
	organizationId: organizationIdSchema,
	taskId: taskIdSchema,
	runId: runIdSchema,
	agentId: agentIdSchema,
	runRevision: z.number().int().positive(),
	leaseToken: institutionalUuidSchema,
	idempotencyKey: z.string().min(1).max(256),
});
export const cancelTaskRunCommandSchema = z.object({
	organizationId: organizationIdSchema,
	taskId: taskIdSchema,
	runId: runIdSchema,
	agentId: agentIdSchema,
	runRevision: z.number().int().positive(),
	idempotencyKey: z.string().min(1).max(256),
	leaseToken: institutionalUuidSchema.optional(),
	reason: z.string().min(1).max(256).optional(),
});
export const stopRunForBudgetCommandSchema = z.object({
	organizationId: organizationIdSchema,
	taskId: taskIdSchema,
	runId: runIdSchema,
	agentId: agentIdSchema,
	runRevision: z.number().int().positive(),
	idempotencyKey: z.string().min(1).max(256),
	reason: z.string().min(1).max(256).optional(),
});
export const stopRunForBudgetResultSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	status: runStatusSchema,
	runRevision: z.number().int().positive(),
	cancelledHeartbeats: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
});
export const cancelTaskRunResultSchema = z.object({
	runId: runIdSchema,
	taskId: taskIdSchema,
	status: runStatusSchema,
	runRevision: z.number().int().positive(),
	cancelledHeartbeats: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
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
export type ReleaseTaskLeaseCommand = z.infer<
	typeof releaseTaskLeaseCommandSchema
>;
export type RecordGateDispositionCommand = z.infer<
	typeof recordGateDispositionCommandSchema
>;
export type ProposePlanRevisionCommand = z.infer<
	typeof proposePlanRevisionCommandSchema
>;
export type IngestTaskboardWebhookCommand = z.infer<
	typeof ingestTaskboardWebhookCommandSchema
>;
export type RecordRunHeartbeatCommand = z.infer<
	typeof recordRunHeartbeatCommandSchema
>;
export type DequeueRunHeartbeatsCommand = z.infer<
	typeof dequeueRunHeartbeatsCommandSchema
>;
export type AcknowledgeRunHeartbeatCommand = z.infer<
	typeof acknowledgeRunHeartbeatCommandSchema
>;
export type SweepExpiredLeasesCommand = z.infer<
	typeof sweepExpiredLeasesCommandSchema
>;

export type RequestWaitingHumanInputCommand = z.infer<
	typeof requestWaitingHumanInputCommandSchema
>;
export type ResumeFromWaitingHumanInputCommand = z.infer<
	typeof resumeFromWaitingHumanInputCommandSchema
>;
export type RestartRunFromCheckpointCommand = z.infer<
	typeof restartRunFromCheckpointCommandSchema
>;

export type StopRunForBudgetCommand = z.infer<
	typeof stopRunForBudgetCommandSchema
>;
export type StopRunForBudgetResult = z.infer<
	typeof stopRunForBudgetResultSchema
>;
export type CancelTaskRunCommand = z.infer<typeof cancelTaskRunCommandSchema>;
export type CancelTaskRunResult = z.infer<typeof cancelTaskRunResultSchema>;
