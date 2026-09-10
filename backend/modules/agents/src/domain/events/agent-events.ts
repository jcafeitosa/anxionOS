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
	agentSkillBoundPayloadSchema,
	brainInvocationRequestedPayloadSchema,
	skillRegisteredPayloadSchema,
	skillVersionCreatedPayloadSchema,
	skillVersionEvaluatedPayloadSchema,
	skillVersionSubmittedPayloadSchema,
	agentRoutineRegisteredPayloadSchema,
	agentRoutinePausedPayloadSchema,
	agentRoutineResumedPayloadSchema,
	agentRoutineTriggeredPayloadSchema,
	agentBudgetPolicySetPayloadSchema,
	agentBudgetExhaustedPayloadSchema,
	type AgentRegisteredPayload,
	type AgentSkillBoundPayload,
	type AgentStatusChangedPayload,
	type AgentVersionPublishedPayload,
	type AgentVersionRolledBackPayload,
	type AgentsEventType,
	type BrainInvocationRequestedPayload,
	type SkillRegisteredPayload,
	type SkillVersionCreatedPayload,
	type SkillVersionEvaluatedPayload,
	type SkillVersionSubmittedPayload,
	type AgentRoutineRegisteredPayload,
	type AgentRoutinePausedPayload,
	type AgentRoutineResumedPayload,
	type AgentRoutineTriggeredPayload,
	type AgentBudgetPolicySetPayload,
	type AgentBudgetExhaustedPayload,
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

export function createSkillRegisteredEvent(
	payload: SkillRegisteredPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.SKILL_REGISTERED,
		skillRegisteredPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createSkillVersionCreatedEvent(
	payload: SkillVersionCreatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.SKILL_VERSION_CREATED,
		skillVersionCreatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createSkillVersionSubmittedEvent(
	payload: SkillVersionSubmittedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.SKILL_VERSION_SUBMITTED,
		skillVersionSubmittedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createSkillVersionEvaluatedEvent(
	payload: SkillVersionEvaluatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.SKILL_VERSION_EVALUATED,
		skillVersionEvaluatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgentSkillBoundEvent(
	payload: AgentSkillBoundPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createAgentsEvent(
		AGENTS_EVENT_TYPES.AGENT_SKILL_BOUND,
		agentSkillBoundPayloadSchema.parse(payload),
		occurredAt,
	);
}


export function createAgentRoutineRegisteredEvent(payload: AgentRoutineRegisteredPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_ROUTINE_REGISTERED, agentRoutineRegisteredPayloadSchema.parse(payload), occurredAt);
}

export function createAgentRoutinePausedEvent(payload: AgentRoutinePausedPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_ROUTINE_PAUSED, agentRoutinePausedPayloadSchema.parse(payload), occurredAt);
}

export function createAgentRoutineResumedEvent(payload: AgentRoutineResumedPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_ROUTINE_RESUMED, agentRoutineResumedPayloadSchema.parse(payload), occurredAt);
}

export function createAgentRoutineTriggeredEvent(payload: AgentRoutineTriggeredPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_ROUTINE_TRIGGERED, agentRoutineTriggeredPayloadSchema.parse(payload), occurredAt);
}

export function createAgentBudgetPolicySetEvent(payload: AgentBudgetPolicySetPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_BUDGET_POLICY_SET, agentBudgetPolicySetPayloadSchema.parse(payload), occurredAt);
}

export function createAgentBudgetExhaustedEvent(payload: AgentBudgetExhaustedPayload, occurredAt?: Date): DomainEventEnvelope {
	return createAgentsEvent(AGENTS_EVENT_TYPES.AGENT_BUDGET_EXHAUSTED, agentBudgetExhaustedPayloadSchema.parse(payload), occurredAt);
}
