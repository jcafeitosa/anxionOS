import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	ORCHESTRATION_EVENT_TYPES,
	ORCHESTRATION_OWNER_DOMAIN,
	type OrchestrationGateDispositionRecordedV1Payload,
	type OrchestrationRunBudgetStoppedV1Payload,
	type OrchestrationRunOrphanedV1Payload,
	type OrchestrationRunRestartedFromCheckpointV1Payload,
	type OrchestrationRunResumedFromHumanV1Payload,
	type OrchestrationRunTerminatedV1Payload,
	type OrchestrationRunWaitingHumanRequestedV1Payload,
	type OrchestrationTaskCheckedOutV1Payload,
	type OrchestrationTaskLeaseReleasedV1Payload,
	type OrchestrationTaskLeaseRenewedV1Payload,
	orchestrationGateDispositionRecordedV1PayloadSchema,
	orchestrationRunBudgetStoppedV1PayloadSchema,
	orchestrationRunOrphanedV1PayloadSchema,
	orchestrationRunRestartedFromCheckpointV1PayloadSchema,
	orchestrationRunResumedFromHumanV1PayloadSchema,
	orchestrationRunTerminatedV1PayloadSchema,
	orchestrationRunWaitingHumanRequestedV1PayloadSchema,
	orchestrationTaskCheckedOutV1PayloadSchema,
	orchestrationTaskLeaseReleasedV1PayloadSchema,
	orchestrationTaskLeaseRenewedV1PayloadSchema,
} from "@anxionos/contracts/orchestration";

function createOrchestrationEvent(
	eventType: (typeof ORCHESTRATION_EVENT_TYPES)[keyof typeof ORCHESTRATION_EVENT_TYPES],
	payload: unknown,
	occurredAt: Date = new Date(),
): DomainEventEnvelope {
	return domainEventEnvelopeSchema.parse({
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: ORCHESTRATION_OWNER_DOMAIN,
		eventType,
		occurredAt: occurredAt.toISOString(),
		payload,
	});
}

export function createTaskCheckedOutEvent(
	payload: OrchestrationTaskCheckedOutV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT,
		orchestrationTaskCheckedOutV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
export function createTaskLeaseRenewedEvent(
	payload: OrchestrationTaskLeaseRenewedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED,
		orchestrationTaskLeaseRenewedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
export function createTaskLeaseReleasedEvent(
	payload: OrchestrationTaskLeaseReleasedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED,
		orchestrationTaskLeaseReleasedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
export function createRunOrphanedEvent(
	payload: OrchestrationRunOrphanedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED,
		orchestrationRunOrphanedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
export function createGateDispositionRecordedEvent(
	payload: OrchestrationGateDispositionRecordedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED,
		orchestrationGateDispositionRecordedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createRunWaitingHumanRequestedEvent(
	payload: OrchestrationRunWaitingHumanRequestedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_WAITING_HUMAN_REQUESTED,
		orchestrationRunWaitingHumanRequestedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
export function createRunResumedFromHumanEvent(
	payload: OrchestrationRunResumedFromHumanV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_RESUMED_FROM_HUMAN,
		orchestrationRunResumedFromHumanV1PayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createRunRestartedFromCheckpointEvent(
	payload: OrchestrationRunRestartedFromCheckpointV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_RESTARTED_FROM_CHECKPOINT,
		orchestrationRunRestartedFromCheckpointV1PayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createRunTerminatedEvent(
	payload: OrchestrationRunTerminatedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_TERMINATED,
		orchestrationRunTerminatedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createRunBudgetStoppedEvent(
	payload: OrchestrationRunBudgetStoppedV1Payload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrchestrationEvent(
		ORCHESTRATION_EVENT_TYPES.RUN_BUDGET_STOPPED,
		orchestrationRunBudgetStoppedV1PayloadSchema.parse(payload),
		occurredAt,
	);
}
