import { z } from "zod";
import {
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
} as const;

export type OpenBotEventType =
	(typeof OPENBOT_EVENT_TYPES)[keyof typeof OPENBOT_EVENT_TYPES];

export const toolCallDeniedPayloadSchema = z.object({
	requestId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
	toolName: z.string().min(1).max(128),
	decision: toolCallDecisionSchema,
});

export const toolCallForwardedPayloadSchema = z.object({
	requestId: z.string().uuid(),
	organizationId: z.string().uuid(),
	agentId: z.string().uuid(),
	toolName: z.string().min(1).max(128),
	decision: toolCallDecisionSchema,
	effect: toolCallEffectSchema,
});

export const computerSessionAcquiredPayloadSchema = z.object({
	commandId: z.string().uuid(),
	session: computerSessionRefSchema,
});

export const computerSessionReleasedPayloadSchema = z.object({
	commandId: z.string().uuid(),
	session: computerSessionRefSchema,
});

export const computerSessionTakeoverPayloadSchema = z.object({
	commandId: z.string().uuid(),
	session: computerSessionRefSchema,
	operatorId: z.string().uuid(),
	revokedAuthorityToken: z.string().uuid(),
	previousController: z.enum(["bot", "human"]),
});

export const computerSessionBotResumedPayloadSchema = z.object({
	commandId: z.string().uuid(),
	session: computerSessionRefSchema,
	revokedAuthorityToken: z.string().uuid(),
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
