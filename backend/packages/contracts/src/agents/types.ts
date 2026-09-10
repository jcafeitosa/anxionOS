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

export const skillVersionStatusSchema = z.enum([
	"draft",
	"candidate",
	"verified",
	"rejected",
	"expired",
	"revoked",
]);

export const skillPermissionRequirementSchema = z.object({
	capabilityId: z.string().min(1).max(128),
	grant: z.string().min(1).max(128),
});

export const skillSandboxPolicySchema = z.object({
	allowedSideEffects: z.array(z.string().min(1).max(64)).max(32).default([]),
	requiresApproval: z.boolean().default(false),
});

export const evaluationRefSchema = z.object({
	evaluationId: z.string().uuid(),
	rubricVersion: z.string().min(1).max(64),
	outcome: z.enum(["pass", "fail"]),
	evidenceHash: z.string().min(1).max(128),
});

export const skillBindingConfigSchema = z.record(
	z.string().min(1).max(64),
	z.unknown(),
);

export const skillRefSchema = z.object({
	skillId: z.string().uuid(),
	schemaVersion: z.string().min(1).max(32),
});

export const skillVersionRefSchema = z.object({
	skillVersionId: z.string().uuid(),
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
export type SkillVersionRef = z.infer<typeof skillVersionRefSchema>;
export type SkillVersionStatus = z.infer<typeof skillVersionStatusSchema>;
export type SkillPermissionRequirement = z.infer<
	typeof skillPermissionRequirementSchema
>;
export type SkillSandboxPolicy = z.infer<typeof skillSandboxPolicySchema>;
export type EvaluationRef = z.infer<typeof evaluationRefSchema>;
export type SkillBindingConfig = z.infer<typeof skillBindingConfigSchema>;
export type ModelSlotBinding = z.infer<typeof modelSlotBindingSchema>;

export const routineTriggerKindSchema = z.enum([
	"schedule",
	"event",
	"webhook",
	"taskboard",
	"manual",
]);

export const routineStatusSchema = z.enum(["active", "paused"]);

export const agentBudgetStatusSchema = z.enum([
	"active",
	"paused",
	"exhausted",
]);

export const routineTriggerConfigSchema = z.record(
	z.string().min(1).max(64),
	z.unknown(),
);

export const agentBudgetCapsSchema = z.object({
	wakeupUnitCap: z.number().int().nonnegative(),
	tokenUnitCap: z.number().int().nonnegative(),
	timeSecondsCap: z.number().int().nonnegative(),
});

export type RoutineTriggerKind = z.infer<typeof routineTriggerKindSchema>;
export type RoutineStatus = z.infer<typeof routineStatusSchema>;
export type AgentBudgetStatus = z.infer<typeof agentBudgetStatusSchema>;
export type RoutineTriggerConfig = z.infer<typeof routineTriggerConfigSchema>;
export type AgentBudgetCaps = z.infer<typeof agentBudgetCapsSchema>;
