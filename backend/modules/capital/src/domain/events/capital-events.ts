import { type DomainEventEnvelope } from "@anxionos/contracts/events";
import { randomUUID } from "node:crypto";
import { CAPITAL_EVENT_TYPES, CAPITAL_OWNER_DOMAIN, schemaVersion } from "@anxionos/contracts/capital";

ownerUserId: string;
    baseCurrency: string;
    organizationId: string;
}): DomainEventEnvelope;

    accountId: string;
    grantId: string;
    portfolioId: string;
    organizationId: string;
    limitAmount: string;
    limitCurrency: string;
}): DomainEventEnvelope;

    accountId: string;
    intentHash: string;
    amount: string;
    asset: string;
    organizationId: string;
}): DomainEventEnvelope;

export function createAccountRegisteredEvent(input: {
    accountId: string;
    ownerUserId: string;
    baseCurrency: string;
    organizationId: string;
}): DomainEventEnvelope {
    return {
        eventId: randomUUID(),
        eventType: CAPITAL_EVENT_TYPES.ACCOUNT_REGISTERED,
        schemaVersion,
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
        schemaVersion,
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
        schemaVersion,
        ownerDomain: CAPITAL_OWNER_DOMAIN,
        occurredAt: new Date().toISOString(),
        payload: input,
    };
}
