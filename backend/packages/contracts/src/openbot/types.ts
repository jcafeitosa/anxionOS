import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";

export const toolInvocationDecisionSchema = z.enum(["ALLOW", "DENY", "DEFER"]);

export const toolAuditPhaseSchema = z.enum(["before", "after"]);

export const computerSessionStatusSchema = z.enum([
	"pending",
	"active",
	"released",
	"terminated",
]);

/** Who holds exclusive computer session authority (R144-05). */
export const computerSessionControllerSchema = z.enum(["bot", "human"]);

export const toolCallRequestSchema = z.object({
	requestId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	toolName: z.string().min(1).max(128),
	inputHash: z.string().min(1).max(128),
});

export const toolCallDecisionSchema = z.object({
	requestId: institutionalUuidSchema,
	decision: toolInvocationDecisionSchema,
	ruleId: z.string().min(1).max(128).optional(),
	reason: z.string().max(512).optional(),
});

export const toolCallEffectSchema = z.object({
	effectId: institutionalUuidSchema,
	requestId: institutionalUuidSchema,
	outcomeHash: z.string().min(1).max(128),
});

export const computerSessionRefSchema = z.object({
	sessionId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	workspacePath: z.string().min(1).max(512),
	status: computerSessionStatusSchema,
	/** Rotates on acquire, takeover and resume; prior values are revoked (R144-05). */
	authorityToken: institutionalUuidSchema,
	controller: computerSessionControllerSchema,
});

export const toolAuditEntrySchema = z.object({
	auditId: institutionalUuidSchema,
	requestId: institutionalUuidSchema,
	phase: toolAuditPhaseSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	toolName: z.string().min(1).max(128),
	decision: toolInvocationDecisionSchema.optional(),
	ruleId: z.string().min(1).max(128).optional(),
	outcomeHash: z.string().min(1).max(128).optional(),
	recordedAt: z.string().datetime(),
});

export const sandboxToolCatalogEntrySchema = z.object({
	toolName: z.string().min(1).max(128),
	schemaVersion: z.string().min(1).max(32),
	description: z.string().max(512),
	sandboxOnly: z.literal(true),
});

export const sandboxToolCatalogSchema = z.object({
	catalogId: z.string().min(1).max(64),
	entries: z.array(sandboxToolCatalogEntrySchema).min(1),
});

export type ToolInvocationDecision = z.infer<typeof toolInvocationDecisionSchema>;
export type ToolAuditPhase = z.infer<typeof toolAuditPhaseSchema>;
export type ComputerSessionStatus = z.infer<typeof computerSessionStatusSchema>;
export type ComputerSessionController = z.infer<
	typeof computerSessionControllerSchema
>;
export type ToolCallRequest = z.infer<typeof toolCallRequestSchema>;
export type ToolCallDecision = z.infer<typeof toolCallDecisionSchema>;
export type ToolCallEffect = z.infer<typeof toolCallEffectSchema>;
export type ComputerSessionRef = z.infer<typeof computerSessionRefSchema>;
export type ToolAuditEntry = z.infer<typeof toolAuditEntrySchema>;
export type SandboxToolCatalogEntry = z.infer<
	typeof sandboxToolCatalogEntrySchema
>;
export type SandboxToolCatalog = z.infer<typeof sandboxToolCatalogSchema>;

/** Bot execution generation lifecycle (R144-08). Run revision is sourced from orchestration. */
export const botRunGenerationStatusSchema = z.enum([
	"active",
	"aborted",
	"released",
]);

export const botRunGenerationRefSchema = z.object({
	generationId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	runId: institutionalUuidSchema,
	/** Orchestration Run.revision at acquire time — fencing token (D-AGT-003). */
	runRevision: z.number().int().positive(),
	/** Monotonic sequence per run; stale generations carry lower values. */
	generationSequence: z.number().int().positive(),
	status: botRunGenerationStatusSchema,
	/** Scoped abort credential; aborting A must not cancel B. */
	abortToken: institutionalUuidSchema,
});

export type BotRunGenerationStatus = z.infer<typeof botRunGenerationStatusSchema>;
export type BotRunGenerationRef = z.infer<typeof botRunGenerationRefSchema>;
