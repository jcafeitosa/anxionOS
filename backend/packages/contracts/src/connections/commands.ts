import { z } from "zod";
import { inferenceRequirementsSchema } from "../inference/requirements";
import { aiAccountIdSchema, connectionBindingIdSchema, connectionEnvironmentSchema, connectionIdSchema, connectionKindSchema, connectionsSecretRefSchema, grantRefSchema, } from "./types";
export const connectionsCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    inferenceRequestId: z.string().uuid().optional(),
});
export const registerAIAccountCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    ownerPrincipalId: z.string().uuid(),
    providerId: z.string().min(1).max(64),
    displayName: z.string().min(1).max(256),
    scopes: z.array(z.string().min(1)).max(32).default([]),
});
export const authorizeAIAccountCommandSchema = z.object({
    commandId: z.string().uuid(),
    aiAccountId: aiAccountIdSchema,
    secretRef: connectionsSecretRefSchema,
    expectedRevision: z.number().int().nonnegative(),
});
export const createConnectionBindingCommandSchema = z
    .object({
    commandId: z.string().uuid(),
    connectionId: connectionIdSchema,
    aiAccountId: aiAccountIdSchema,
    kind: z.string().min(1),
    environment: connectionEnvironmentSchema,
    adapterId: z.string().min(1).max(64),
    grantRef: grantRefSchema,
    rateLimits: z.record(z.string(), z.number()).optional(),
    budgetLimits: z.record(z.string(), z.number()).optional(),
})
    .superRefine((value, ctx) => {
    if (value.kind === "REAL_EXECUTION") {
        ctx.addIssue({
            code: "custom",
            message: "CX_CONNECTION_KIND_NOT_SUPPORTED",
            path: ["kind"],
        });
        return;
    }
    const parsed = connectionKindSchema.safeParse(value.kind);
    if (!parsed.success) {
        ctx.addIssue({
            code: "custom",
            message: "CX_CONNECTION_KIND_NOT_SUPPORTED",
            path: ["kind"],
        });
    }
});
export const activateConnectionBindingCommandSchema = z.object({
    commandId: z.string().uuid(),
    bindingId: connectionBindingIdSchema,
    bindingVersion: z.number().int().positive(),
    expectedRevision: z.number().int().nonnegative(),
});
export const agentModelBindingRefSchema = z.object({
    agentId: z.string().uuid(),
    agentVersionId: z.string().uuid(),
    slotId: z.string().min(1).max(64),
    modelOfferingId: z.string().min(1).max(64),
    bindingId: connectionBindingIdSchema,
    bindingVersion: z.number().int().positive(),
});
export const invokeInferenceCommandSchema = z.object({
    commandId: z.string().uuid(),
    bindingId: connectionBindingIdSchema,
    bindingVersion: z.number().int().positive(),
    operation: z.string().min(1).max(128),
    requirements: inferenceRequirementsSchema,
    typedInput: z.record(z.string(), z.unknown()),
    agentModelBindingRef: agentModelBindingRefSchema.optional(),
    taskId: z.string().uuid().optional(),
    runId: z.string().uuid().optional(),
    deadline: z.string().datetime(),
    idempotencyKey: z.string().uuid(),
});

export type ConnectionsCommandResult = z.infer<typeof connectionsCommandResultSchema>;

export type RegisterAIAccountCommand = z.infer<typeof registerAIAccountCommandSchema>;
export type InvokeInferenceCommand = z.infer<typeof invokeInferenceCommandSchema>;
