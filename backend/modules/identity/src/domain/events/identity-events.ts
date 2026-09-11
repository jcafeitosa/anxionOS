import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	IDENTITY_EVENT_TYPES,
	IDENTITY_OWNER_DOMAIN,
	identityPrincipalAuthLinkedV1PayloadSchema,
	identityPrincipalEmailUpdatedV1PayloadSchema,
	identityPrincipalReactivatedV1PayloadSchema,
	identityPrincipalRegisteredV1PayloadSchema,
	identityPrincipalRevokedV1PayloadSchema,
	identityPrincipalSuspendedV1PayloadSchema,
	identityServiceCredentialIssuedV1PayloadSchema,
	identityServiceCredentialRevokedV1PayloadSchema,
	identityServiceCredentialRotatedV1PayloadSchema,
	identityServiceIdentityRegisteredV1PayloadSchema,
	identityServiceIdentityRevokedV1PayloadSchema,
	identitySessionRevokedV1PayloadSchema,
} from "@anxionos/contracts/identity";
import type { PrincipalKind } from "../entities/principal";

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
	kind?: PrincipalKind;
	revision?: number;
	occurredAt?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_REGISTERED,
		input.occurredAt ?? new Date().toISOString(),
		identityPrincipalRegisteredV1PayloadSchema.parse({
			principalId: input.principalId,
			email: input.email,
			kind: input.kind,
			revision: input.revision,
		}),
	);
}

export function createPrincipalSuspendedEvent(input: {
	principalId: string;
	reasonCode: string;
	suspendedAt: string;
	revision?: number;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED,
		input.suspendedAt,
		identityPrincipalSuspendedV1PayloadSchema.parse({
			principalId: input.principalId,
			reasonCode: input.reasonCode,
			suspendedAt: input.suspendedAt,
			revision: input.revision,
		}),
	);
}

export function createPrincipalRevokedEvent(input: {
	principalId: string;
	reasonCode: string;
	revokedAt: string;
	revision?: number;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_REVOKED,
		input.revokedAt,
		identityPrincipalRevokedV1PayloadSchema.parse({
			principalId: input.principalId,
			reasonCode: input.reasonCode,
			revokedAt: input.revokedAt,
			revision: input.revision,
		}),
	);
}

export function createPrincipalReactivatedEvent(input: {
	principalId: string;
	reactivatedAt: string;
	actorPrincipalId?: string;
	revision?: number;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_REACTIVATED,
		input.reactivatedAt,
		identityPrincipalReactivatedV1PayloadSchema.parse({
			principalId: input.principalId,
			reactivatedAt: input.reactivatedAt,
			actorPrincipalId: input.actorPrincipalId,
			revision: input.revision,
		}),
	);
}

export function createPrincipalAuthLinkedEvent(input: {
	principalId: string;
	occurredAt?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.PRINCIPAL_AUTH_LINKED,
		input.occurredAt ?? new Date().toISOString(),
		identityPrincipalAuthLinkedV1PayloadSchema.parse({
			principalId: input.principalId,
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

/** INV-IDN-03: carries the logical `sessionRefId`, never a token or cookie. */
export function createSessionRevokedEvent(input: {
	sessionRefId: string;
	principalId: string;
	revokedAt: string;
	reasonCode?: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SESSION_REVOKED,
		input.revokedAt,
		identitySessionRevokedV1PayloadSchema.parse({
			sessionRefId: input.sessionRefId,
			principalId: input.principalId,
			revokedAt: input.revokedAt,
			reasonCode: input.reasonCode,
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

/** Secret never appears in the payload — only the public prefix. */
export function createServiceCredentialIssuedEvent(input: {
	credentialId: string;
	serviceIdentityId: string;
	principalId: string;
	prefix: string;
	issuedAt: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ISSUED,
		input.issuedAt,
		identityServiceCredentialIssuedV1PayloadSchema.parse({
			credentialId: input.credentialId,
			serviceIdentityId: input.serviceIdentityId,
			principalId: input.principalId,
			prefix: input.prefix,
			issuedAt: input.issuedAt,
		}),
	);
}

export function createServiceCredentialRotatedEvent(input: {
	credentialId: string;
	previousCredentialId: string;
	serviceIdentityId: string;
	prefix: string;
	rotatedAt: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_ROTATED,
		input.rotatedAt,
		identityServiceCredentialRotatedV1PayloadSchema.parse({
			credentialId: input.credentialId,
			previousCredentialId: input.previousCredentialId,
			serviceIdentityId: input.serviceIdentityId,
			prefix: input.prefix,
			rotatedAt: input.rotatedAt,
		}),
	);
}

export function createServiceCredentialRevokedEvent(input: {
	credentialId: string;
	serviceIdentityId: string;
	revokedAt: string;
}): DomainEventEnvelope {
	return baseEnvelope(
		IDENTITY_EVENT_TYPES.SERVICE_CREDENTIAL_REVOKED,
		input.revokedAt,
		identityServiceCredentialRevokedV1PayloadSchema.parse({
			credentialId: input.credentialId,
			serviceIdentityId: input.serviceIdentityId,
			revokedAt: input.revokedAt,
		}),
	);
}
