import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	approvalResolvedPayloadSchema,
	authorityEpochBumpedPayloadSchema,
	changeProposalSubmittedPayloadSchema,
	GOVERNANCE_EVENT_TYPES,
	GOVERNANCE_OWNER_DOMAIN,
	grantIssuedPayloadSchema,
	grantRevokedPayloadSchema,
	type ApprovalResolvedPayload,
	type AuthorityEpochBumpedPayload,
	type ChangeProposalSubmittedPayload,
	type GovernanceEventType,
	type GrantIssuedPayload,
	type GrantRevokedPayload,
} from "@anxionos/contracts/governance";

function createGovernanceEvent(
	eventType: GovernanceEventType,
	payload: unknown,
	occurredAt = new Date(),
): DomainEventEnvelope {
	return domainEventEnvelopeSchema.parse({
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: GOVERNANCE_OWNER_DOMAIN,
		eventType,
		occurredAt: occurredAt.toISOString(),
		payload,
	});
}

export function createGrantIssuedEvent(
	payload: GrantIssuedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
		grantIssuedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createGrantRevokedEvent(
	payload: GrantRevokedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
		grantRevokedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAuthorityEpochBumpedEvent(
	payload: AuthorityEpochBumpedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.AUTHORITY_EPOCH_BUMPED,
		authorityEpochBumpedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createChangeProposalSubmittedEvent(
	payload: ChangeProposalSubmittedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.CHANGE_PROPOSAL_SUBMITTED,
		changeProposalSubmittedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createApprovalResolvedEvent(
	payload: ApprovalResolvedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.APPROVAL_RESOLVED,
		approvalResolvedPayloadSchema.parse(payload),
		occurredAt,
	);
}
