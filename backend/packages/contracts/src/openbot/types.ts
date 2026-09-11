import { z } from "zod";

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
	requestId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
	toolName: z.string().min(1).max(128),
	inputHash: z.string().min(1).max(128),
});

export const toolCallDecisionSchema = z.object({
	requestId: z.string().uuid(),
	decision: toolInvocationDecisionSchema,
	ruleId: z.string().min(1).max(128).optional(),
	reason: z.string().max(512).optional(),
});

export const toolCallEffectSchema = z.object({
	effectId: z.string().uuid(),
	requestId: z.string().uuid(),
	outcomeHash: z.string().min(1).max(128),
});

export const computerSessionRefSchema = z.object({
	sessionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
	workspacePath: z.string().min(1).max(512),
	status: computerSessionStatusSchema,
	/** Rotates on acquire, takeover and resume; prior values are revoked (R144-05). */
	authorityToken: z.string().uuid(),
	controller: computerSessionControllerSchema,
});

export const toolAuditEntrySchema = z.object({
	auditId: z.string().uuid(),
	requestId: z.string().uuid(),
	phase: toolAuditPhaseSchema,
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
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
