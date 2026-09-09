import { randomUUID } from "node:crypto";
import {
	CONNECTIONS_EVENT_TYPES,
	CONNECTIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/connections";
import { type DomainEventEnvelope } from "@anxionos/contracts/events";

export function createAiAccountRegisteredEvent(input: {
	aiAccountId: string;
	ownerPrincipalId: string;
	providerId: string;
	organizationId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CONNECTIONS_EVENT_TYPES.AI_ACCOUNT_REGISTERED,
		schemaVersion: "0.1.0",
		ownerDomain: CONNECTIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: {
			aiAccountId: input.aiAccountId,
			ownerPrincipalId: input.ownerPrincipalId,
			providerId: input.providerId,
			organizationId: input.organizationId,
		},
	};
}

export function createInferenceCompletedEvent(input: {
	inferenceRequestId: string;
	bindingId: string;
	modelRef: string;
	latencyMs: number;
	usageRecordId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CONNECTIONS_EVENT_TYPES.INFERENCE_COMPLETED,
		schemaVersion: "0.1.0",
		ownerDomain: CONNECTIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: {
			inferenceRequestId: input.inferenceRequestId,
			bindingId: input.bindingId,
			modelRef: input.modelRef,
			latencyMs: input.latencyMs,
			usageRecordId: input.usageRecordId,
		},
	};
}

export function createUsageRecordedEvent(input: {
	usageRecordId: string;
	quantity: number;
	unit: string;
	consumerKind: string;
	taskId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CONNECTIONS_EVENT_TYPES.USAGE_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: CONNECTIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: {
			usageRecordId: input.usageRecordId,
			quantity: input.quantity,
			unit: input.unit,
			consumerKind: input.consumerKind,
			taskId: input.taskId,
		},
	};
}
