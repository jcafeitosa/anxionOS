import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	AGENTS_EVENT_TYPES,
	AGENTS_OWNER_DOMAIN,
	agentRegisteredPayloadSchema,
	agentStatusChangedPayloadSchema,
	agentVersionPublishedPayloadSchema,
	agentVersionRolledBackPayloadSchema,
	brainInvocationRequestedPayloadSchema,
	type AgentRegisteredPayload,
	type AgentStatusChangedPayload,
	type AgentVersionPublishedPayload,
	type AgentVersionRolledBackPayload,
	type AgentsEventType,
	type BrainInvocationRequestedPayload,
} from "@anxionos/contracts/agents";

function createAgentsEvent(
	eventType: AgentsEventType,
	payload: unknown,
	occurredAt = new Date(),
): DomainEventEnvelope {
	return domainEventEnvelopeSchema.parse({
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: AGENTS_OWNER_DOMAIN,
		eventType,
		occurredAt: occurredAt.toISOString(),
		payload,
	});
}

export function createAgentRegisteredEvent(
	payload: AgentRegisteredPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.AGENT_REGISTERED,
		agentRegisteredPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgentVersionPublishedEvent(
	payload: AgentVersionPublishedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED,
		agentVersionPublishedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgentStatusChangedEvent(
	payload: AgentStatusChangedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED,
		agentStatusChangedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgentVersionRolledBackEvent(
	payload: AgentVersionRolledBackPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK,
		agentVersionRolledBackPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createBrainInvocationRequestedEvent(
	payload: BrainInvocationRequestedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.BRAIN_INVOCATION_REQUESTED,
		brainInvocationRequestedPayloadSchema.parse(payload),
		occurredAt,
	);
}
