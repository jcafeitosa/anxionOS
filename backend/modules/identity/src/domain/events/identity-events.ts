import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	IDENTITY_EVENT_TYPES,
	IDENTITY_OWNER_DOMAIN,
	identityPrincipalEmailUpdatedV1PayloadSchema,
	identityPrincipalReactivatedV1PayloadSchema,
	identityPrincipalRegisteredV1PayloadSchema,
	identityPrincipalSuspendedV1PayloadSchema,
	identityServiceIdentityRegisteredV1PayloadSchema,
	identityServiceIdentityRevokedV1PayloadSchema,
} from "@anxionos/contracts/identity";

function baseEnvelope(
	eventType: string,
	occurredAt: string,
	payload: Record<string, unknown>,
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: IDENTITY_OWNER_DOMAIN,
		eventType,
		occurredAt,
		payload,
	};
}

export function createPrincipalRegisteredEvent(input: {
	principalId: string;
	email: string;
	occurredAt?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
		input.occurredAt ?? new Date().toISOString(),
		identityPrincipalRegisteredV1PayloadSchema.parse({
			principalId: input.principalId,
			email: input.email,
		}),
	);
}

export function createPrincipalSuspendedEvent(input: {
	principalId: string;
	reasonCode: string;
	suspendedAt: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		input.suspendedAt,
		identityPrincipalSuspendedV1PayloadSchema.parse({
			principalId: input.principalId,
			reasonCode: input.reasonCode,
			suspendedAt: input.suspendedAt,
		}),
	);
}

export function createPrincipalReactivatedEvent(input: {
	principalId: string;
	reactivatedAt: string;
	actorPrincipalId?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
		input.reactivatedAt,
		identityPrincipalReactivatedV1PayloadSchema.parse({
			principalId: input.principalId,
			reactivatedAt: input.reactivatedAt,
			actorPrincipalId: input.actorPrincipalId,
		}),
	);
}

export function createPrincipalEmailUpdatedEvent(input: {
	principalId: string;
	email: string;
	occurredAt?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_EMAIL_UPDATED,
		input.occurredAt ?? new Date().toISOString(),
		identityPrincipalEmailUpdatedV1PayloadSchema.parse({
			principalId: input.principalId,
			email: input.email,
		}),
	);
}

export function createServiceIdentityRegisteredEvent(input: {
	serviceIdentityId: string;
	principalId: string;
	label: string;
	occurredAt?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REGISTERED,
		input.occurredAt ?? new Date().toISOString(),
		identityServiceIdentityRegisteredV1PayloadSchema.parse({
			serviceIdentityId: input.serviceIdentityId,
			principalId: input.principalId,
			label: input.label,
		}),
	);
}

export function createServiceIdentityRevokedEvent(input: {
	serviceIdentityId: string;
	principalId: string;
	revokedAt: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SERVICE_IDENTITY_REVOKED,
		input.revokedAt,
		identityServiceIdentityRevokedV1PayloadSchema.parse({
			serviceIdentityId: input.serviceIdentityId,
			principalId: input.principalId,
			revokedAt: input.revokedAt,
		}),
	);
}
