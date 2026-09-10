import { z } from "zod";

export const agentKindSchema = z.enum(["AGENCY", "PLATFORM"]);
export const agentLifecycleStatusSchema = z.enum([
	"DRAFT",
	"CONFIGURED",
	"READY",
	"ACTIVE",
	"PAUSED",
	"DRAINING",
	"ARCHIVED",
]);
export const agentVersionStatusSchema = z.enum([
	"draft",
	"published",
	"deprecated",
]);
export const autonomyLevelSchema = z.enum(["L0", "L1", "L2", "L3", "L4"]);

export const objectRefSchema = z.object({
	bucket: z.string().min(1).max(64),
	key: z.string().min(1).max(512),
	contentHash: z.string().min(1).max(128),
});

export const skillRefSchema = z.object({
	skillId: z.string().uuid(),
	schemaVersion: z.string().min(1).max(32),
});

export const modelSlotBindingSchema = z.object({
	slotId: z.string().min(1).max(64),
	modelBindingId: z.string().min(1).max(128),
});

export type AgentKind = z.infer<typeof agentKindSchema>;
export type AgentLifecycleStatus = z.infer<typeof agentLifecycleStatusSchema>;
export type AgentVersionStatus = z.infer<typeof agentVersionStatusSchema>;
export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;
export type ObjectRef = z.infer<typeof objectRefSchema>;
export type SkillRef = z.infer<typeof skillRefSchema>;
export type ModelSlotBinding = z.infer<typeof modelSlotBindingSchema>;
