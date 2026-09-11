import { randomUUID } from "node:crypto";
import {
	DECISIONS_EVENT_TYPES,
	DECISIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/decisions";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createProposalCreatedEvent(input: {
	decisionId: string;
	proposalId: string;
	organizationId: string;
	grantId: string;
	expectedAuthorityEpoch: number;
	proposalKind: string;
	correlationId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.PROPOSAL_CREATED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createAuthorityCheckedEvent(input: {
	decisionId: string;
	organizationId: string;
	grantId: string;
	authorityEpoch: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.AUTHORITY_CHECKED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createApprovalRequestedEvent(input: {
	decisionId: string;
	organizationId: string;
	approvalId: string;
	proposerId: string;
	correlationId: string;
	runId?: string;
	operationId?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.APPROVAL_REQUESTED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createApprovalRecordedEvent(input: {
	decisionId: string;
	organizationId: string;
	approvalId: string;
	approverId: string;
	proposerId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.APPROVAL_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createDispositionRecordedEvent(input: {
	decisionId: string;
	organizationId: string;
	dispositionId: string;
	dispositionKind: string;
	outcome: string;
	reason: string;
	approverId: string;
	intentHash?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.DISPOSITION_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createIntentSubmittedEvent(input: {
	decisionId: string;
	intentId: string;
	organizationId: string;
	intentHash: string;
	instrumentId: string;
	side: string;
	quantity: string;
	price: string;
	executionMode: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.INTENT_SUBMITTED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createEvidenceManifestRecordedEvent(input: {
	decisionId: string;
	organizationId: string;
	evidenceManifestId: string;
	manifestHash: string;
	entryCount: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: DECISIONS_EVENT_TYPES.EVIDENCE_MANIFEST_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: DECISIONS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
