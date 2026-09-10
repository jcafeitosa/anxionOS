import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	ORGANIZATION_EVENT_TYPES,
	ORGANIZATIONS_OWNER_DOMAIN,
	agencyCreatedPayloadSchema,
	agencyMarketsUpdatedPayloadSchema,
	agencyStatusChangedPayloadSchema,
	membershipActivatedPayloadSchema,
	membershipInvitedPayloadSchema,
	membershipRevokedPayloadSchema,
	ownershipTransferredPayloadSchema,
	type AgencyCreatedPayload,
	type AgencyMarketsUpdatedPayload,
	type AgencyStatusChangedPayload,
	type MembershipActivatedPayload,
	type MembershipInvitedPayload,
	type MembershipRevokedPayload,
	type OrganizationEventType,
	type OwnershipTransferredPayload,
} from "@anxionos/contracts/organizations";

function extractAgencyIdFromPayload(
	payload: unknown,
	eventType: OrganizationEventType,
): string {
	if (
		payload &&
		typeof payload === "object" &&
		"agencyId" in payload &&
		typeof (payload as { agencyId: unknown }).agencyId === "string"
	) {
		return (payload as { agencyId: string }).agencyId;
	}
	throw new Error(
		`Organization event payload must include agencyId (eventType=${eventType})`,
	);
}

function createOrganizationEvent(
	eventType: OrganizationEventType,
	payload: unknown,
	occurredAt = new Date(),
): DomainEventEnvelope {
	const agencyId = extractAgencyIdFromPayload(payload, eventType);
	return domainEventEnvelopeSchema.parse({
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
		eventType,
		occurredAt: occurredAt.toISOString(),
		agencyId,
		payload,
	});
}

export function createAgencyCreatedEvent(
	payload: AgencyCreatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.AGENCY_CREATED,
		agencyCreatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgencyMarketsUpdatedEvent(
	payload: AgencyMarketsUpdatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.AGENCY_MARKETS_UPDATED,
		agencyMarketsUpdatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createAgencyStatusChangedEvent(
	payload: AgencyStatusChangedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.AGENCY_STATUS_CHANGED,
		agencyStatusChangedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createMembershipInvitedEvent(
	payload: MembershipInvitedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.MEMBERSHIP_INVITED,
		membershipInvitedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createMembershipActivatedEvent(
	payload: MembershipActivatedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
		membershipActivatedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createMembershipRevokedEvent(
	payload: MembershipRevokedPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.MEMBERSHIP_REVOKED,
		membershipRevokedPayloadSchema.parse(payload),
		occurredAt,
	);
}

export function createOwnershipTransferredEvent(
	payload: OwnershipTransferredPayload,
	occurredAt?: Date,
): DomainEventEnvelope {
	return createOrganizationEvent(
		ORGANIZATION_EVENT_TYPES.OWNERSHIP_TRANSFERRED,
		ownershipTransferredPayloadSchema.parse(payload),
		occurredAt,
	);
}
