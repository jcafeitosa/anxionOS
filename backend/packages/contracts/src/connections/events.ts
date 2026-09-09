import { z } from "zod";
import { aiAccountIdSchema, connectionBindingIdSchema, connectionKindSchema, connectionsSecretRefSchema, consumerKindSchema, grantRefSchema, inferenceRequestIdSchema, usageRecordIdSchema, } from "./types";
export const CONNECTIONS_OWNER_DOMAIN = "connections";
export const CONNECTIONS_EVENT_TYPES = {
    AI_ACCOUNT_REGISTERED: "connections.ai_account.registered.v1",
    AI_ACCOUNT_AUTHORIZED: "connections.ai_account.authorized.v1",
    BINDING_CREATED: "connections.binding.created.v1",
    BINDING_ACTIVATED: "connections.binding.activated.v1",
    BINDING_SUSPENDED: "connections.binding.suspended.v1",
    BINDING_REVOKED: "connections.binding.revoked.v1",
    INFERENCE_STREAM: "connections.inference.stream.v1",
    INFERENCE_COMPLETED: "connections.inference.completed.v1",
    INFERENCE_FAILED: "connections.inference.failed.v1",
    USAGE_RECORDED: "connections.usage.recorded.v1",
    QUOTA_EXCEEDED: "connections.quota.exceeded.v1",
    HEALTH_CHANGED: "connections.health.changed.v1",
    CALL_UNKNOWN: "connections.call.unknown.v1",
    RECONCILED: "connections.reconciled.v1",
};
export const aiAccountRegisteredPayloadSchema = z.object({
    aiAccountId: aiAccountIdSchema,
    ownerPrincipalId: z.string().uuid(),
    providerId: z.string().min(1),
    organizationId: z.string().uuid(),
});
export const bindingActivatedPayloadSchema = z.object({
    bindingId: connectionBindingIdSchema,
    bindingVersion: z.number().int().positive(),
    grantRef: grantRefSchema,
    kind: connectionKindSchema,
    activatedAt: z.string().datetime(),
});
export const inferenceCompletedPayloadSchema = z.object({
    inferenceRequestId: inferenceRequestIdSchema,
    bindingId: connectionBindingIdSchema,
    modelRef: z.string().min(1),
    latencyMs: z.number().int().nonnegative(),
    usageRecordId: usageRecordIdSchema.optional(),
});
export const usageRecordedPayloadSchema = z.object({
    usageRecordId: usageRecordIdSchema,
    quantity: z.number().nonnegative(),
    unit: z.string().min(1),
    consumerKind: consumerKindSchema,
    taskId: z.string().uuid().optional(),
});
export const aiAccountAuthorizedPayloadSchema = z.object({
    aiAccountId: aiAccountIdSchema,
    secretRef: connectionsSecretRefSchema,
    authorityEpoch: z.number().int().nonnegative(),
});
export const connectionsEventPayloadSchema = z.discriminatedUnion("eventType", [
    z.object({
        eventType: z.literal(CONNECTIONS_EVENT_TYPES.AI_ACCOUNT_REGISTERED),
        payload: aiAccountRegisteredPayloadSchema,
    }),
    z.object({
        eventType: z.literal(CONNECTIONS_EVENT_TYPES.AI_ACCOUNT_AUTHORIZED),
        payload: aiAccountAuthorizedPayloadSchema,
    }),
    z.object({
        eventType: z.literal(CONNECTIONS_EVENT_TYPES.BINDING_ACTIVATED),
        payload: bindingActivatedPayloadSchema,
    }),
    z.object({
        eventType: z.literal(CONNECTIONS_EVENT_TYPES.INFERENCE_COMPLETED),
        payload: inferenceCompletedPayloadSchema,
    }),
    z.object({
        eventType: z.literal(CONNECTIONS_EVENT_TYPES.USAGE_RECORDED),
        payload: usageRecordedPayloadSchema,
    }),
]);

export type ConnectionsEventType = (typeof CONNECTIONS_EVENT_TYPES)[keyof typeof CONNECTIONS_EVENT_TYPES];
