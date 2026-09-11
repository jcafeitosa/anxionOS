import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import type { ComputerSessionRef } from "@anxionos/contracts/openbot";
import {
	type GovernedToolCallResult,
	governedToolCallResultSchema,
	type InvokeToolCallCommand,
	invokeToolCallCommandSchema,
	OPENBOT_EVENT_TYPES,
	type ToolAuditEntry,
	type ToolCallDecision,
	toolAuditAfterRecordedPayloadSchema,
	toolAuditBeforeRecordedPayloadSchema,
	toolCallDeniedPayloadSchema,
	toolCallForwardedPayloadSchema,
} from "@anxionos/contracts/openbot";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";
import type { ToolAuditPort } from "../../domain/ports/tool-audit-port";
import type { ToolGatewayPort } from "../../domain/ports/tool-gateway-port";
import {
	evaluateComputerSessionAuthority,
	toolRequiresComputerSession,
} from "../services/computer-session-policy";

type DomainEvent = ReturnType<typeof domainEventEnvelopeSchema.parse>;
type PublishEvents = (events: DomainEvent[]) => Promise<void>;

export interface ExecuteGovernedToolCallDeps {
	toolGateway: ToolGatewayPort;
	toolAudit: ToolAuditPort;
	/** Active computer session when tool requires sandbox computer context (R144-03). */
	computerSession?: ComputerSessionRef;
	/** Resolves live session and revoked authority tokens (R144-05). */
	computerSessionPort?: ComputerSessionPort;
	publishEvents?: PublishEvents;
}

async function publishAuditBefore(
	publishEvents: PublishEvents | undefined,
	entry: ToolAuditEntry,
): Promise<void> {
	if (!publishEvents) {
		return;
	}
	const payload = toolAuditBeforeRecordedPayloadSchema.parse({ entry });
	await publishEvents([
		domainEventEnvelopeSchema.parse({
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "openbot",
			eventType: OPENBOT_EVENT_TYPES.AUDIT_BEFORE_RECORDED,
			occurredAt: entry.recordedAt,
			payload,
		}),
	]);
}

async function publishAuditAfter(
	publishEvents: PublishEvents | undefined,
	entry: ToolAuditEntry,
): Promise<void> {
	if (!publishEvents) {
		return;
	}
	const payload = toolAuditAfterRecordedPayloadSchema.parse({ entry });
	await publishEvents([
		domainEventEnvelopeSchema.parse({
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "openbot",
			eventType: OPENBOT_EVENT_TYPES.AUDIT_AFTER_RECORDED,
			occurredAt: entry.recordedAt,
			payload,
		}),
	]);
}

async function publishToolCallDenied(
	publishEvents: PublishEvents | undefined,
	input: {
		requestId: string;
		organizationId: string;
		agentId: string;
		toolName: string;
		decision: ToolCallDecision;
	},
): Promise<void> {
	if (!publishEvents) {
		return;
	}
	const deniedPayload = toolCallDeniedPayloadSchema.parse(input);
	await publishEvents([
		domainEventEnvelopeSchema.parse({
			eventId: randomUUID(),
			schemaVersion: "0.1.0",
			ownerDomain: "openbot",
			eventType: OPENBOT_EVENT_TYPES.TOOL_CALL_DENIED,
			occurredAt: new Date().toISOString(),
			payload: deniedPayload,
		}),
	]);
}

async function recordDeniedBeforeAudit(
	deps: ExecuteGovernedToolCallDeps,
	input: {
		requestId: string;
		organizationId: string;
		agentId: string;
		toolName: string;
		decision: ToolCallDecision;
	},
): Promise<void> {
	const entry = await deps.toolAudit.recordBefore({
		requestId: input.requestId,
		organizationId: input.organizationId,
		agentId: input.agentId,
		toolName: input.toolName,
		decision: input.decision.decision,
		ruleId: input.decision.ruleId,
	});
	await publishAuditBefore(deps.publishEvents, entry);
	await publishToolCallDenied(deps.publishEvents, input);
}

export async function executeGovernedToolCall(
	deps: ExecuteGovernedToolCallDeps,
	input: InvokeToolCallCommand,
): Promise<GovernedToolCallResult> {
	const command = invokeToolCallCommandSchema.parse(input);
	const request = {
		requestId: command.requestId,
		organizationId: command.organizationId,
		agentId: command.agentId,
		toolName: command.toolName,
		inputHash: command.inputHash,
	};

	if (toolRequiresComputerSession(request.toolName)) {
		let liveSession = deps.computerSession;
		if (deps.computerSessionPort && deps.computerSession) {
			const resolved = await deps.computerSessionPort.getSession({
				sessionId: deps.computerSession.sessionId,
				organizationId: request.organizationId,
			});
			if (resolved) {
				liveSession = resolved;
			}
		}

		const authorityDenial = evaluateComputerSessionAuthority({
			session: liveSession,
			organizationId: request.organizationId,
			agentId: request.agentId,
			presentedAuthorityToken: deps.computerSession?.authorityToken,
			isAuthorityRevoked: deps.computerSessionPort?.isAuthorityRevoked.bind(
				deps.computerSessionPort,
			),
		});

		if (authorityDenial) {
			const reasonByRule: Record<string, string> = {
				"openbot.computer.session.required":
					"Active computer session required for this tool",
				"openbot.computer.session.mismatch":
					"Computer session tenant does not match tool call context",
				"openbot.computer.takeover.active":
					"Human takeover holds exclusive computer authority",
				"openbot.computer.authority.revoked":
					"Computer session authority token was revoked",
			};
			const deniedDecision: ToolCallDecision = {
				requestId: request.requestId,
				decision: "DENY",
				ruleId: authorityDenial,
				reason: reasonByRule[authorityDenial],
			};
			await recordDeniedBeforeAudit(deps, {
				...request,
				decision: deniedDecision,
			});
			return governedToolCallResultSchema.parse({
				commandId: command.commandId,
				requestId: request.requestId,
				decision: deniedDecision,
			});
		}
	}

	const decision = await deps.toolGateway.authorizeToolCall(request);

	const beforeEntry = await deps.toolAudit.recordBefore({
		requestId: request.requestId,
		organizationId: request.organizationId,
		agentId: request.agentId,
		toolName: request.toolName,
		decision: decision.decision,
		ruleId: decision.ruleId,
	});
	await publishAuditBefore(deps.publishEvents, beforeEntry);

	if (decision.decision !== "ALLOW") {
		await publishToolCallDenied(deps.publishEvents, {
			...request,
			decision,
		});
		return governedToolCallResultSchema.parse({
			commandId: command.commandId,
			requestId: request.requestId,
			decision,
		});
	}

	const effect = await deps.toolGateway.forwardToolCall({ request, decision });

	const afterEntry = await deps.toolAudit.recordAfter({
		requestId: request.requestId,
		organizationId: request.organizationId,
		agentId: request.agentId,
		toolName: request.toolName,
		outcomeHash: effect.outcomeHash,
	});
	await publishAuditAfter(deps.publishEvents, afterEntry);

	const forwardedPayload = toolCallForwardedPayloadSchema.parse({
		requestId: request.requestId,
		organizationId: request.organizationId,
		agentId: request.agentId,
		toolName: request.toolName,
		decision,
		effect,
	});
	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.TOOL_CALL_FORWARDED,
				occurredAt: new Date().toISOString(),
				payload: forwardedPayload,
			}),
		]);
	}

	return governedToolCallResultSchema.parse({
		commandId: command.commandId,
		requestId: request.requestId,
		decision,
		effect,
	});
}
