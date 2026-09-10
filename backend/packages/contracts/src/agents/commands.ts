import { z } from "zod";
import {
	agentKindSchema,
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
export type PublishAgentVersionCommand = z.infer<
	typeof publishAgentVersionCommandSchema
>;
