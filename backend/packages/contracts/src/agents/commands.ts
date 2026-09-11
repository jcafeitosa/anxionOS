import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	agentKindSchema,
	agentLifecycleStatusSchema,
	autonomyLevelSchema,
	evaluationRefSchema,
	modelSlotBindingSchema,
	objectRefSchema,
	skillBindingConfigSchema,
	skillPermissionRequirementSchema,
	skillRefSchema,
	skillSandboxPolicySchema,
	routineTriggerKindSchema,
	routineTriggerConfigSchema,
	agentBudgetCapsSchema,
} from "./types";

export const commandResultSchema = z.object({
	aggregateId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
});

export const registerAgentCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	displayName: z.string().min(1).max(256),
	kind: agentKindSchema,
	agencyId: institutionalUuidSchema.optional(),
});

export const transitionAgentStatusCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
	targetStatus: agentLifecycleStatusSchema,
});

export const rollbackAgentVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
	targetVersionNumber: z.number().int().positive(),
});

export const invokeBrainCapabilityCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	agentVersionId: institutionalUuidSchema.optional(),
	capabilityId: z.string().min(1).max(128),
	correlationId: z.string().min(1).max(128),
});

export const registerSkillCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	slug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z][a-z0-9-]*$/),
	displayName: z.string().min(1).max(256),
	description: z.string().max(2048).optional(),
	agencyId: institutionalUuidSchema.optional(),
});

export const createSkillVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	skillId: institutionalUuidSchema,
	schemaVersion: z.string().min(1).max(32),
	contentRef: objectRefSchema,
	contentHash: z.string().min(1).max(128),
	permissionRequirements: z
		.array(skillPermissionRequirementSchema)
		.max(32)
		.default([]),
	sandboxPolicy: skillSandboxPolicySchema.default(() => ({
		allowedSideEffects: [],
		requiresApproval: false,
	})),
});

export const submitSkillVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	skillId: institutionalUuidSchema,
	skillVersionId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
});

export const recordSkillVersionEvaluationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	skillId: institutionalUuidSchema,
	skillVersionId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
	outcome: z.enum(["verified", "rejected"]),
	evaluationRef: evaluationRefSchema,
});

export const bindAgentSkillCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	agentVersionId: institutionalUuidSchema,
	skillVersionId: institutionalUuidSchema,
	expectedAgentRevision: z.number().int().nonnegative(),
	bindingConfig: skillBindingConfigSchema.default(() => ({})),
});

export const publishAgentVersionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	versionNumber: z.number().int().positive(),
	expectedRevision: z.number().int().nonnegative(),
	instructionRef: objectRefSchema,
	skillRefs: z.array(skillRefSchema).max(64).default([]),
	capabilityManifestHash: z.string().min(1).max(128),
	modelSlots: z.array(modelSlotBindingSchema).max(32).default([]),
	autonomyLevel: autonomyLevelSchema,
});

export type CommandResult = z.infer<typeof commandResultSchema>;
export type RegisterAgentCommand = z.infer<typeof registerAgentCommandSchema>;
export type TransitionAgentStatusCommand = z.infer<
	typeof transitionAgentStatusCommandSchema
>;
export type RollbackAgentVersionCommand = z.infer<
	typeof rollbackAgentVersionCommandSchema
>;
export type InvokeBrainCapabilityCommand = z.infer<
	typeof invokeBrainCapabilityCommandSchema
>;
export type PublishAgentVersionCommand = z.infer<
	typeof publishAgentVersionCommandSchema
>;
export type RegisterSkillCommand = z.infer<typeof registerSkillCommandSchema>;
export type CreateSkillVersionCommand = z.infer<
	typeof createSkillVersionCommandSchema
>;
export type SubmitSkillVersionCommand = z.infer<
	typeof submitSkillVersionCommandSchema
>;
export type RecordSkillVersionEvaluationCommand = z.infer<
	typeof recordSkillVersionEvaluationCommandSchema
>;


export const registerAgentRoutineCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	slug: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[a-z][a-z0-9-]*$/),
	displayName: z.string().min(1).max(256),
	triggerKind: routineTriggerKindSchema,
	triggerConfig: routineTriggerConfigSchema.default(() => ({})),
	cooldownSeconds: z.number().int().nonnegative().default(0),
});

export const pauseAgentRoutineCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	routineId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
});

export const resumeAgentRoutineCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	routineId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
});

export const triggerAgentRoutineCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	routineId: institutionalUuidSchema,
	dedupeKey: z.string().min(1).max(256),
	expectedRevision: z.number().int().nonnegative(),
});

export const triggerAgentRoutineResultSchema = z.object({
	routineId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	dedupeKey: z.string().min(1).max(256),
	runId: institutionalUuidSchema.optional(),
	idempotentReplay: z.boolean().optional(),
});

export const setAgentBudgetPolicyCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	caps: agentBudgetCapsSchema,
});

export const consumeAgentBudgetCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	expectedRevision: z.number().int().nonnegative(),
	wakeupUnits: z.number().int().nonnegative().default(0),
	tokenUnits: z.number().int().nonnegative().default(0),
	timeSeconds: z.number().int().nonnegative().default(0),
});

export const consumeAgentBudgetResultSchema = z.object({
	agentId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	status: z.enum(["active", "paused", "exhausted"]),
	idempotentReplay: z.boolean().optional(),
});

export type BindAgentSkillCommand = z.infer<typeof bindAgentSkillCommandSchema>;

export type RegisterAgentRoutineCommand = z.infer<typeof registerAgentRoutineCommandSchema>;
export type PauseAgentRoutineCommand = z.infer<typeof pauseAgentRoutineCommandSchema>;
export type ResumeAgentRoutineCommand = z.infer<typeof resumeAgentRoutineCommandSchema>;
export type TriggerAgentRoutineCommand = z.infer<typeof triggerAgentRoutineCommandSchema>;
export type TriggerAgentRoutineResult = z.infer<typeof triggerAgentRoutineResultSchema>;
export type SetAgentBudgetPolicyCommand = z.infer<typeof setAgentBudgetPolicyCommandSchema>;
export type ConsumeAgentBudgetCommand = z.infer<typeof consumeAgentBudgetCommandSchema>;
export type ConsumeAgentBudgetResult = z.infer<typeof consumeAgentBudgetResultSchema>;
