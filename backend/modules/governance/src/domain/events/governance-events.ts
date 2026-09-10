import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type ApprovalResolvedPayload,
	type AuthorityEpochBumpedPayload,
	type ChangeProposalSubmittedPayload,
	type BreakGlassActivatedPayload,
	type DelegationCreatedPayload,
	GOVERNANCE_EVENT_TYPES,
	GOVERNANCE_OWNER_DOMAIN,
	type GovernanceEventType,
	type GrantIssuedPayload,
	type GrantRevokedPayload,
	type MandateIssuedPayload,
	type AutonomyAssignedPayload,
	type AutonomyTransitionedPayload,
	approvalResolvedPayloadSchema,
	autonomyAssignedPayloadSchema,
	autonomyTransitionedPayloadSchema,
	authorityEpochBumpedPayloadSchema,
	breakGlassActivatedPayloadSchema,
	changeProposalSubmittedPayloadSchema,
	delegationCreatedPayloadSchema,
	grantIssuedPayloadSchema,
	grantRevokedPayloadSchema,
	mandateIssuedPayloadSchema,
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

export function createMandateIssuedEvent(
	payload: MandateIssuedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.MANDATE_ISSUED,
		mandateIssuedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createBreakGlassActivatedEvent(
	payload: BreakGlassActivatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.BREAK_GLASS_ACTIVATED,
		breakGlassActivatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createDelegationCreatedEvent(
	payload: DelegationCreatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.DELEGATION_CREATED,
		delegationCreatedPayloadSchema.parse(payload),
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

export function createAutonomyAssignedEvent(
	payload: AutonomyAssignedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.AUTONOMY_ASSIGNED,
		autonomyAssignedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAutonomyTransitionedEvent(
	payload: AutonomyTransitionedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createGovernanceEvent(
		GOVERNANCE_EVENT_TYPES.AUTONOMY_TRANSITIONED,
		autonomyTransitionedPayloadSchema.parse(payload),
		occurredAt,
	);
}
