import { type DomainEventEnvelope } from "@anxionos/contracts/events";
import { type OrchestrationRunOrphanedV1Payload, type OrchestrationTaskCheckedOutV1Payload, type OrchestrationTaskLeaseReleasedV1Payload, type OrchestrationTaskLeaseRenewedV1Payload, type OrchestrationGateDispositionRecordedV1Payload } from "@anxionos/contracts/orchestration";
import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { ORCHESTRATION_EVENT_TYPES, ORCHESTRATION_OWNER_DOMAIN, orchestrationTaskCheckedOutV1PayloadSchema, orchestrationTaskLeaseReleasedV1PayloadSchema, orchestrationTaskLeaseRenewedV1PayloadSchema, orchestrationRunOrphanedV1PayloadSchema, orchestrationGateDispositionRecordedV1PayloadSchema } from "@anxionos/contracts/orchestration";

function createOrchestrationEvent(eventType, payload, occurredAt = new Date()) {
    return domainEventEnvelopeSchema.parse({
        eventId: randomUUID(),
        schemaVersion: "0.1.0",
        ownerDomain: ORCHESTRATION_OWNER_DOMAIN,
        eventType,
        occurredAt: occurredAt.toISOString(),
        payload,
    });
}
export function createTaskCheckedOutEvent(payload: OrchestrationTaskCheckedOutV1Payload, occurredAt?: Date): DomainEventEnvelope {
    return createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT, orchestrationTaskCheckedOutV1PayloadSchema.parse(payload), occurredAt);
}
export function createTaskLeaseRenewedEvent(payload: OrchestrationTaskLeaseRenewedV1Payload, occurredAt?: Date): DomainEventEnvelope {
    return createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED, orchestrationTaskLeaseRenewedV1PayloadSchema.parse(payload), occurredAt);
}
export function createTaskLeaseReleasedEvent(payload: OrchestrationTaskLeaseReleasedV1Payload, occurredAt?: Date): DomainEventEnvelope {
    return createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED, orchestrationTaskLeaseReleasedV1PayloadSchema.parse(payload), occurredAt);
}
export function createRunOrphanedEvent(payload: OrchestrationRunOrphanedV1Payload, occurredAt?: Date): DomainEventEnvelope {
    return createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED, orchestrationRunOrphanedV1PayloadSchema.parse(payload), occurredAt);
}
export function createGateDispositionRecordedEvent(payload: OrchestrationGateDispositionRecordedV1Payload, occurredAt?: Date): DomainEventEnvelope {
    return createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED, orchestrationGateDispositionRecordedV1PayloadSchema.parse(payload), occurredAt);
}
