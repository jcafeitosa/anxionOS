import {
	governedToolCallResultSchema,
	invokeToolCallCommandSchema,
	OPENBOT_EVENT_TYPES,
	toolCallDeniedPayloadSchema,
	toolCallForwardedPayloadSchema,
	type GovernedToolCallResult,
	type InvokeToolCallCommand,
} from "@anxionos/contracts/openbot";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { randomUUID } from "node:crypto";
import type { ToolAuditPort } from "../../domain/ports/tool-audit-port";
import type { ToolGatewayPort } from "../../domain/ports/tool-gateway-port";

export interface ExecuteGovernedToolCallDeps {
	toolGateway: ToolGatewayPort;
	toolAudit: ToolAuditPort;
	publishEvents?: (events: ReturnType<typeof domainEventEnvelopeSchema.parse>[]) => Promise<void>;
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

	const decision = await deps.toolGateway.authorizeToolCall(request);

	await deps.toolAudit.recordBefore({
		requestId: request.requestId,
		organizationId: request.organizationId,
		agentId: request.agentId,
		toolName: request.toolName,
		decision: decision.decision,
	});

	if (decision.decision !== "ALLOW") {
		const deniedPayload = toolCallDeniedPayloadSchema.parse({
			requestId: request.requestId,
			organizationId: request.organizationId,
			agentId: request.agentId,
			toolName: request.toolName,
			decision,
		});
		if (deps.publishEvents) {
			await deps.publishEvents([
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
		return governedToolCallResultSchema.parse({
			commandId: command.commandId,
			requestId: request.requestId,
			decision,
		});
	}

	const effect = await deps.toolGateway.forwardToolCall({ request, decision });

	await deps.toolAudit.recordAfter({
		requestId: request.requestId,
		organizationId: request.organizationId,
		agentId: request.agentId,
		toolName: request.toolName,
		outcomeHash: effect.outcomeHash,
	});

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
