import { randomUUID } from "node:crypto";
import {
	CAPITAL_EVENT_TYPES,
	CAPITAL_OWNER_DOMAIN,
} from "@anxionos/contracts/capital";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createAccountRegisteredEvent(input: {
	accountId: string;
	ownerUserId: string;
	baseCurrency: string;
	organizationId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CAPITAL_EVENT_TYPES.ACCOUNT_REGISTERED,
		schemaVersion: "0.1.0",
		ownerDomain: CAPITAL_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
export function createAllocationProposedEvent(input: {
	allocationId: string;
	accountId: string;
	grantId: string;
	portfolioId: string;
	organizationId: string;
	limitAmount: string;
	limitCurrency: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CAPITAL_EVENT_TYPES.ALLOCATION_PROPOSED,
		schemaVersion: "0.1.0",
		ownerDomain: CAPITAL_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
export function createReservationCreatedEvent(input: {
	reservationId: string;
	accountId: string;
	intentHash: string;
	amount: string;
	asset: string;
	organizationId: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CAPITAL_EVENT_TYPES.RESERVATION_CREATED,
		schemaVersion: "0.1.0",
		ownerDomain: CAPITAL_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createReservationReleasedEvent(input: {
	reservationId: string;
	accountId: string;
	organizationId: string;
	releasedAmount: string;
	remainingAmount: string;
	asset: string;
	reason: "cancel" | "partial_fill" | "expired";
	status: "HELD" | "RELEASED" | "EXPIRED";
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: CAPITAL_EVENT_TYPES.RESERVATION_RELEASED,
		schemaVersion: "0.1.0",
		ownerDomain: CAPITAL_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
