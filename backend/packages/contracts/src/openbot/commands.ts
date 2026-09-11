import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	botRunGenerationRefSchema,
	computerSessionRefSchema,
	toolCallDecisionSchema,
	toolCallEffectSchema,
	toolCallRequestSchema,
} from "./types";

export const invokeToolCallCommandSchema = toolCallRequestSchema.extend({
	commandId: institutionalUuidSchema,
});

export const governedToolCallResultSchema = z.object({
	commandId: institutionalUuidSchema,
	requestId: institutionalUuidSchema,
	decision: toolCallDecisionSchema,
	effect: toolCallEffectSchema.optional(),
});

export type InvokeToolCallCommand = z.infer<typeof invokeToolCallCommandSchema>;

export const acquireComputerSessionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
});

export const releaseComputerSessionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	sessionId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
});

export const takeoverComputerSessionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	sessionId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	operatorId: institutionalUuidSchema,
});

export const resumeBotControlCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	sessionId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
});

export const computerSessionCommandResultSchema = z.object({
	commandId: institutionalUuidSchema,
	session: computerSessionRefSchema,
});

export type GovernedToolCallResult = z.infer<
	typeof governedToolCallResultSchema
>;
export type AcquireComputerSessionCommand = z.infer<
	typeof acquireComputerSessionCommandSchema
>;
export type ReleaseComputerSessionCommand = z.infer<
	typeof releaseComputerSessionCommandSchema
>;
export type TakeoverComputerSessionCommand = z.infer<
	typeof takeoverComputerSessionCommandSchema
>;
export type ResumeBotControlCommand = z.infer<
	typeof resumeBotControlCommandSchema
>;

export const computerSessionTakeoverResultSchema =
	computerSessionCommandResultSchema.extend({
		revokedAuthorityToken: institutionalUuidSchema,
		previousController: z.enum(["bot", "human"]),
	});

export type ComputerSessionCommandResult = z.infer<
	typeof computerSessionCommandResultSchema
>;
export type ComputerSessionTakeoverResult = z.infer<
	typeof computerSessionTakeoverResultSchema
>;

export const acquireBotRunGenerationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	runId: institutionalUuidSchema,
	runRevision: z.number().int().positive(),
});

export const abortBotRunGenerationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	generationId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	abortToken: institutionalUuidSchema,
	runRevision: z.number().int().positive(),
});

export const releaseBotRunGenerationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	generationId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
});

export const botRunGenerationCommandResultSchema = z.object({
	commandId: institutionalUuidSchema,
	generation: botRunGenerationRefSchema,
	idempotentReplay: z.boolean().optional(),
});

export type AcquireBotRunGenerationCommand = z.infer<
	typeof acquireBotRunGenerationCommandSchema
>;
export type AbortBotRunGenerationCommand = z.infer<
	typeof abortBotRunGenerationCommandSchema
>;
export type ReleaseBotRunGenerationCommand = z.infer<
	typeof releaseBotRunGenerationCommandSchema
>;
export type BotRunGenerationCommandResult = z.infer<
	typeof botRunGenerationCommandResultSchema
>;
