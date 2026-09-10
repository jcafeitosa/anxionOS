import { z } from "zod";
import {
	agentKindSchema,
	agentLifecycleStatusSchema,
	autonomyLevelSchema,
	modelSlotBindingSchema,
	objectRefSchema,
	skillRefSchema,
} from "./types";

export const commandResultSchema = z.object({
	aggregateId: z.string().uuid(),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
});

export const registerAgentCommandSchema = z.object({
	commandId: z.string().uuid(),
	displayName: z.string().min(1).max(256),
	kind: agentKindSchema,
	agencyId: z.string().uuid().optional(),
});

export const transitionAgentStatusCommandSchema = z.object({
	commandId: z.string().uuid(),
	agentId: z.string().uuid(),
	expectedRevision: z.number().int().nonnegative(),
	targetStatus: agentLifecycleStatusSchema,
});

export const rollbackAgentVersionCommandSchema = z.object({
	commandId: z.string().uuid(),
	agentId: z.string().uuid(),
	expectedRevision: z.number().int().nonnegative(),
	targetVersionNumber: z.number().int().positive(),
});

export const invokeBrainCapabilityCommandSchema = z.object({
	commandId: z.string().uuid(),
	agentId: z.string().uuid(),
	agentVersionId: z.string().uuid().optional(),
	capabilityId: z.string().min(1).max(128),
	correlationId: z.string().min(1).max(128),
});

export const publishAgentVersionCommandSchema = z.object({
	commandId: z.string().uuid(),
	agentId: z.string().uuid(),
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
