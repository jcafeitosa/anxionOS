import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	botRunGenerationRefSchema,
	computerSessionRefSchema,
	toolAuditEntrySchema,
	toolCallDecisionSchema,
	toolCallEffectSchema,
} from "./types";

export const OPENBOT_OWNER_DOMAIN = "openbot";

export const OPENBOT_EVENT_TYPES = {
	TOOL_CALL_DENIED: "openbot.tool_call.denied.v1",
	TOOL_CALL_FORWARDED: "openbot.tool_call.forwarded.v1",
	COMPUTER_SESSION_ACQUIRED: "openbot.computer_session.acquired.v1",
	COMPUTER_SESSION_RELEASED: "openbot.computer_session.released.v1",
	COMPUTER_SESSION_TAKEOVER: "openbot.computer_session.takeover.v1",
	COMPUTER_SESSION_BOT_RESUMED: "openbot.computer_session.bot_resumed.v1",
	AUDIT_BEFORE_RECORDED: "openbot.audit.before_recorded.v1",
	AUDIT_AFTER_RECORDED: "openbot.audit.after_recorded.v1",
	BOT_RUN_GENERATION_ACQUIRED: "openbot.bot_run_generation.acquired.v1",
	BOT_RUN_GENERATION_ABORTED: "openbot.bot_run_generation.aborted.v1",
	BOT_RUN_GENERATION_RELEASED: "openbot.bot_run_generation.released.v1",
} as const;

export type OpenBotEventType =
	(typeof OPENBOT_EVENT_TYPES)[keyof typeof OPENBOT_EVENT_TYPES];

export const toolCallDeniedPayloadSchema = z.object({
	requestId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	toolName: z.string().min(1).max(128),
	decision: toolCallDecisionSchema,
});

export const toolCallForwardedPayloadSchema = z.object({
	requestId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	agentId: institutionalUuidSchema,
	toolName: z.string().min(1).max(128),
	decision: toolCallDecisionSchema,
	effect: toolCallEffectSchema,
});

export const computerSessionAcquiredPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	session: computerSessionRefSchema,
});

export const computerSessionReleasedPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	session: computerSessionRefSchema,
});

export const computerSessionTakeoverPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	session: computerSessionRefSchema,
	operatorId: institutionalUuidSchema,
	revokedAuthorityToken: institutionalUuidSchema,
	previousController: z.enum(["bot", "human"]),
});

export const computerSessionBotResumedPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	session: computerSessionRefSchema,
	revokedAuthorityToken: institutionalUuidSchema,
});

export const toolAuditBeforeRecordedPayloadSchema = z.object({
	entry: toolAuditEntrySchema,
});

export const toolAuditAfterRecordedPayloadSchema = z.object({
	entry: toolAuditEntrySchema,
});

export type ToolCallDeniedPayload = z.infer<typeof toolCallDeniedPayloadSchema>;
export type ToolCallForwardedPayload = z.infer<
	typeof toolCallForwardedPayloadSchema
>;
export type ComputerSessionAcquiredPayload = z.infer<
	typeof computerSessionAcquiredPayloadSchema
>;
export type ComputerSessionReleasedPayload = z.infer<
	typeof computerSessionReleasedPayloadSchema
>;
export type ComputerSessionTakeoverPayload = z.infer<
	typeof computerSessionTakeoverPayloadSchema
>;
export type ComputerSessionBotResumedPayload = z.infer<
	typeof computerSessionBotResumedPayloadSchema
>;
export type ToolAuditBeforeRecordedPayload = z.infer<
	typeof toolAuditBeforeRecordedPayloadSchema
>;
export type ToolAuditAfterRecordedPayload = z.infer<
	typeof toolAuditAfterRecordedPayloadSchema
>;

export const botRunGenerationAcquiredPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	generation: botRunGenerationRefSchema,
});

export const botRunGenerationAbortedPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	generation: botRunGenerationRefSchema,
	idempotentReplay: z.boolean().optional(),
});

export const botRunGenerationReleasedPayloadSchema = z.object({
	commandId: institutionalUuidSchema,
	generation: botRunGenerationRefSchema,
	idempotentReplay: z.boolean().optional(),
});

export type BotRunGenerationAcquiredPayload = z.infer<
	typeof botRunGenerationAcquiredPayloadSchema
>;
export type BotRunGenerationAbortedPayload = z.infer<
	typeof botRunGenerationAbortedPayloadSchema
>;
export type BotRunGenerationReleasedPayload = z.infer<
	typeof botRunGenerationReleasedPayloadSchema
>;
