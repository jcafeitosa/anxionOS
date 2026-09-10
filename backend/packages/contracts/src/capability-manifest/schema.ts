import { z } from "zod";
import { institutionalChannelSchema } from "../envelope-v02";
import { effectClassSchema } from "../execution/effect-gate";

/** Catalog artifact version — distinct from per-capability contract version. */
export const CAPABILITY_MANIFEST_CATALOG_VERSION = 1;

/** Stable ids use `<owner>.<verb>.<noun>` or kernel ids like `authorization.can`. */
export const capabilityIdSchema = z
	.string()
	.regex(/^[a-z][a-z0-9-]*(\.[a-z][a-zA-Z0-9-]*){1,2}$/);

export const capabilityContractVersionSchema = z.number().int().positive();

export const capabilityOwnerModuleSchema = z.enum([
	"identity",
	"organizations",
	"governance",
	"graph",
]);

export const capabilityInvocationChannelSchema = institutionalChannelSchema;

export const executionModeSchema = z.enum(["SIMULATED", "PAPER", "REAL"]);

export const idempotencyKeyKindSchema = z.enum([
	"commandId",
	"idempotencyKey",
	"intentHash",
	"authUserId",
	"none",
]);

export const idempotencyPolicySchema = z.object({
	key: idempotencyKeyKindSchema,
	duplicateBehavior: z.enum(["replay", "conflict"]),
	windowSeconds: z.number().int().positive().optional(),
});

export const approvalPolicySchema = z.object({
	kind: z.enum(["none", "owner_g7", "policy_by_kind"]),
	notes: z.string().max(500).optional(),
});

export const budgetPolicySchema = z.object({
	kind: z.enum(["defer", "quota"]),
	quotaRef: z.string().min(1).optional(),
});

export const timeoutPolicySchema = z.object({
	apiSeconds: z.number().int().positive(),
	governancePortSeconds: z.number().int().positive().optional(),
});

export const auditPolicySchema = z.object({
	requiresCorrelationId: z.boolean(),
	requiresActorPrincipalId: z.boolean(),
	requiresChannel: z.boolean(),
});

/** UI route, REST path and agent tool name for the same capability. */
export const capabilitySurfaceMatrixSchema = z.object({
	ui: z.string().min(1).optional(),
	api: z.string().min(1),
	tool: z.string().min(1).optional(),
});

export const capabilityManifestEntrySchema = z.object({
	capabilityId: capabilityIdSchema,
	version: capabilityContractVersionSchema,
	ownerModule: capabilityOwnerModuleSchema,
	inputSchemaRef: z.string().min(1).optional(),
	outputSchemaRef: z.string().min(1).optional(),
	errorSchemaRef: z.string().min(1).optional(),
	inputSchemaDeferred: z.boolean().optional(),
	requiredGrants: z.array(z.string().min(1)),
	allowedChannels: z.array(capabilityInvocationChannelSchema).min(1),
	allowedExecutionModes: z.array(executionModeSchema).min(1),
	effectClass: effectClassSchema,
	idempotencyPolicy: idempotencyPolicySchema,
	approvalPolicy: approvalPolicySchema,
	budgetPolicy: budgetPolicySchema,
	timeoutPolicy: timeoutPolicySchema,
	auditPolicy: auditPolicySchema,
	surfaces: capabilitySurfaceMatrixSchema,
	envelopeVersion: z.literal("0.2.0").optional(),
});

export const capabilityManifestCatalogSchema = z.object({
	catalogVersion: z.literal(CAPABILITY_MANIFEST_CATALOG_VERSION),
	entries: z.array(capabilityManifestEntrySchema).min(1),
});

export type CapabilityId = z.infer<typeof capabilityIdSchema>;
export type CapabilityOwnerModule = z.infer<typeof capabilityOwnerModuleSchema>;
export type CapabilityInvocationChannel = z.infer<
	typeof capabilityInvocationChannelSchema
>;
export type ExecutionMode = z.infer<typeof executionModeSchema>;
export type IdempotencyPolicy = z.infer<typeof idempotencyPolicySchema>;
export type ApprovalPolicy = z.infer<typeof approvalPolicySchema>;
export type BudgetPolicy = z.infer<typeof budgetPolicySchema>;
export type TimeoutPolicy = z.infer<typeof timeoutPolicySchema>;
export type AuditPolicy = z.infer<typeof auditPolicySchema>;
export type CapabilitySurfaceMatrix = z.infer<
	typeof capabilitySurfaceMatrixSchema
>;
export type CapabilityManifestEntry = z.infer<
	typeof capabilityManifestEntrySchema
>;
export type CapabilityManifestCatalog = z.infer<
	typeof capabilityManifestCatalogSchema
>;
