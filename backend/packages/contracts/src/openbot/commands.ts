import { z } from "zod";
import {
	computerSessionRefSchema,
	toolCallDecisionSchema,
	toolCallEffectSchema,
	toolCallRequestSchema,
} from "./types";

export const invokeToolCallCommandSchema = toolCallRequestSchema.extend({
	commandId: z.string().uuid(),
});

export const governedToolCallResultSchema = z.object({
	commandId: z.string().uuid(),
	requestId: z.string().uuid(),
	decision: toolCallDecisionSchema,
	effect: toolCallEffectSchema.optional(),
});

export type InvokeToolCallCommand = z.infer<typeof invokeToolCallCommandSchema>;

export const acquireComputerSessionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
});

export const releaseComputerSessionCommandSchema = z.object({
	commandId: z.string().uuid(),
	sessionId: z.string().uuid(),
	organizationId: z.string().uuid(),
});

export const takeoverComputerSessionCommandSchema = z.object({
	commandId: z.string().uuid(),
	sessionId: z.string().uuid(),
	organizationId: z.string().uuid(),
	operatorId: z.string().uuid(),
});

export const resumeBotControlCommandSchema = z.object({
	commandId: z.string().uuid(),
	sessionId: z.string().uuid(),
	organizationId: z.string().uuid(),
});

export const computerSessionCommandResultSchema = z.object({
	commandId: z.string().uuid(),
	session: computerSessionRefSchema,
});

export type GovernedToolCallResult = z.infer<typeof governedToolCallResultSchema>;
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
		revokedAuthorityToken: z.string().uuid(),
		previousController: z.enum(["bot", "human"]),
	});

export type ComputerSessionCommandResult = z.infer<
	typeof computerSessionCommandResultSchema
>;
export type ComputerSessionTakeoverResult = z.infer<
	typeof computerSessionTakeoverResultSchema
>;
