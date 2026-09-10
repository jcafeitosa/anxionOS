import { z } from "zod";
import {
	agentKindSchema,
	agentLifecycleStatusSchema,
	autonomyLevelSchema,
	evaluationRefSchema,
	objectRefSchema,
	skillBindingConfigSchema,
	skillPermissionRequirementSchema,
	skillRefSchema,
	skillSandboxPolicySchema,
	skillVersionStatusSchema,
	routineTriggerKindSchema,
	routineTriggerConfigSchema,
	routineStatusSchema,
	agentBudgetCapsSchema,
	agentBudgetStatusSchema,
} from "./types";

export const AGENTS_OWNER_DOMAIN = "agents";

export const AGENTS_EVENT_TYPES = {
	AGENT_REGISTERED: "agents.agent.registered.v1",
	AGENT_STATUS_CHANGED: "agents.agent.status_changed.v1",
	AGENT_VERSION_PUBLISHED: "agents.agent_version.published.v1",
	AGENT_VERSION_ROLLED_BACK: "agents.agent_version.rolled_back.v1",
	BRAIN_INVOCATION_REQUESTED: "agents.brain.invocation.requested.v1",
	SKILL_REGISTERED: "agents.skill.registered.v1",
	SKILL_VERSION_CREATED: "agents.skill_version.created.v1",
	SKILL_VERSION_SUBMITTED: "agents.skill_version.submitted.v1",
	SKILL_VERSION_EVALUATED: "agents.skill_version.evaluated.v1",
	AGENT_SKILL_BOUND: "agents.agent_skill.bound.v1",
	AGENT_ROUTINE_REGISTERED: "agents.routine.registered.v1",
	AGENT_ROUTINE_PAUSED: "agents.routine.paused.v1",
	AGENT_ROUTINE_RESUMED: "agents.routine.resumed.v1",
	AGENT_ROUTINE_TRIGGERED: "agents.routine.triggered.v1",
	AGENT_BUDGET_POLICY_SET: "agents.budget.policy_set.v1",
	AGENT_BUDGET_EXHAUSTED: "agents.budget.exhausted.v1",
} as const;

export const agentRegisteredPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agencyId: z.string().uuid().optional(),
	kind: agentKindSchema,
	displayName: z.string().min(1).max(256),
	status: agentLifecycleStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentStatusChangedPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromStatus: agentLifecycleStatusSchema,
	toStatus: agentLifecycleStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentVersionRolledBackPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromVersionId: z.string().uuid().optional(),
	toVersionId: z.string().uuid(),
	toVersionNumber: z.number().int().positive(),
	revision: z.number().int().nonnegative(),
});

export const brainInvocationRequestedPayloadSchema = z.object({
	invocationId: z.string().uuid(),
	agentId: z.string().uuid(),
	agentVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	capabilityId: z.string().min(1).max(128),
	correlationId: z.string().min(1).max(128),
});

export const skillRegisteredPayloadSchema = z.object({
	skillId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agencyId: z.string().uuid().optional(),
	slug: z.string().min(1).max(64),
	displayName: z.string().min(1).max(256),
	revision: z.number().int().nonnegative(),
});

export const skillVersionCreatedPayloadSchema = z.object({
	skillId: z.string().uuid(),
	skillVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	schemaVersion: z.string().min(1).max(32),
	contentRef: objectRefSchema,
	contentHash: z.string().min(1).max(128),
	status: skillVersionStatusSchema,
	permissionRequirements: z.array(skillPermissionRequirementSchema).max(32),
	sandboxPolicy: skillSandboxPolicySchema,
	revision: z.number().int().nonnegative(),
});

export const skillVersionSubmittedPayloadSchema = z.object({
	skillId: z.string().uuid(),
	skillVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	fromStatus: z.literal("draft"),
	toStatus: z.literal("candidate"),
	revision: z.number().int().nonnegative(),
});

export const skillVersionEvaluatedPayloadSchema = z.object({
	skillId: z.string().uuid(),
	skillVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	fromStatus: z.literal("candidate"),
	toStatus: z.enum(["verified", "rejected"]),
	evaluationRef: evaluationRefSchema,
	revision: z.number().int().nonnegative(),
});

export const agentSkillBoundPayloadSchema = z.object({
	agentId: z.string().uuid(),
	agentVersionId: z.string().uuid(),
	skillVersionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	bindingConfig: skillBindingConfigSchema,
	revision: z.number().int().nonnegative(),
});

export const agentVersionPublishedPayloadSchema = z.object({
	agentVersionId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	versionNumber: z.number().int().positive(),
	capabilityManifestHash: z.string().min(1).max(128),
	autonomyLevel: autonomyLevelSchema,
	instructionRef: objectRefSchema,
	skillRefs: z.array(skillRefSchema).max(64),
	revision: z.number().int().nonnegative(),
});



export const agentRoutineRegisteredPayloadSchema = z.object({
	routineId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	slug: z.string().min(1).max(64),
	displayName: z.string().min(1).max(256),
	triggerKind: routineTriggerKindSchema,
	triggerConfig: routineTriggerConfigSchema,
	status: routineStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentRoutinePausedPayloadSchema = z.object({
	routineId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromStatus: z.literal("active"),
	toStatus: z.literal("paused"),
	revision: z.number().int().nonnegative(),
});

export const agentRoutineResumedPayloadSchema = z.object({
	routineId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromStatus: z.literal("paused"),
	toStatus: z.literal("active"),
	revision: z.number().int().nonnegative(),
});

export const agentRoutineTriggeredPayloadSchema = z.object({
	routineId: z.string().uuid(),
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	dedupeKey: z.string().min(1).max(256),
	runId: z.string().uuid().optional(),
	idempotentReplay: z.boolean().optional(),
	revision: z.number().int().nonnegative(),
});

export const agentBudgetPolicySetPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	caps: agentBudgetCapsSchema,
	status: agentBudgetStatusSchema,
	revision: z.number().int().nonnegative(),
});

export const agentBudgetExhaustedPayloadSchema = z.object({
	agentId: z.string().uuid(),
	organizationId: z.string().uuid(),
	fromStatus: z.literal("active"),
	toStatus: z.enum(["paused", "exhausted"]),
	revision: z.number().int().nonnegative(),
});

export const agentsEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_REGISTERED),
		payload: agentRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED),
		payload: agentStatusChangedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED),
		payload: agentVersionPublishedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK),
		payload: agentVersionRolledBackPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.BRAIN_INVOCATION_REQUESTED),
		payload: brainInvocationRequestedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.SKILL_REGISTERED),
		payload: skillRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.SKILL_VERSION_CREATED),
		payload: skillVersionCreatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.SKILL_VERSION_SUBMITTED),
		payload: skillVersionSubmittedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.SKILL_VERSION_EVALUATED),
		payload: skillVersionEvaluatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_SKILL_BOUND),
		payload: agentSkillBoundPayloadSchema,
	}),

	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_ROUTINE_REGISTERED),
		payload: agentRoutineRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_ROUTINE_PAUSED),
		payload: agentRoutinePausedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_ROUTINE_RESUMED),
		payload: agentRoutineResumedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_ROUTINE_TRIGGERED),
		payload: agentRoutineTriggeredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_BUDGET_POLICY_SET),
		payload: agentBudgetPolicySetPayloadSchema,
	}),
	z.object({
		eventType: z.literal(AGENTS_EVENT_TYPES.AGENT_BUDGET_EXHAUSTED),
		payload: agentBudgetExhaustedPayloadSchema,
	}),
]);

export type AgentsEventType =
	(typeof AGENTS_EVENT_TYPES)[keyof typeof AGENTS_EVENT_TYPES];
export type AgentRegisteredPayload = z.infer<
	typeof agentRegisteredPayloadSchema
>;
export type AgentStatusChangedPayload = z.infer<
	typeof agentStatusChangedPayloadSchema
>;
export type AgentVersionPublishedPayload = z.infer<
	typeof agentVersionPublishedPayloadSchema
>;
export type AgentVersionRolledBackPayload = z.infer<
	typeof agentVersionRolledBackPayloadSchema
>;
export type BrainInvocationRequestedPayload = z.infer<
	typeof brainInvocationRequestedPayloadSchema
>;
export type SkillRegisteredPayload = z.infer<typeof skillRegisteredPayloadSchema>;
export type SkillVersionCreatedPayload = z.infer<
	typeof skillVersionCreatedPayloadSchema
>;
export type SkillVersionSubmittedPayload = z.infer<
	typeof skillVersionSubmittedPayloadSchema
>;
export type SkillVersionEvaluatedPayload = z.infer<
	typeof skillVersionEvaluatedPayloadSchema
>;
export type AgentSkillBoundPayload = z.infer<typeof agentSkillBoundPayloadSchema>;

export type AgentRoutineRegisteredPayload = z.infer<typeof agentRoutineRegisteredPayloadSchema>;
export type AgentRoutinePausedPayload = z.infer<typeof agentRoutinePausedPayloadSchema>;
export type AgentRoutineResumedPayload = z.infer<typeof agentRoutineResumedPayloadSchema>;
export type AgentRoutineTriggeredPayload = z.infer<typeof agentRoutineTriggeredPayloadSchema>;
export type AgentBudgetPolicySetPayload = z.infer<typeof agentBudgetPolicySetPayloadSchema>;
export type AgentBudgetExhaustedPayload = z.infer<typeof agentBudgetExhaustedPayloadSchema>;
