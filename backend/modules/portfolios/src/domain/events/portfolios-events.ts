import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	PORTFOLIOS_EVENT_TYPES,
	PORTFOLIOS_OWNER_DOMAIN,
} from "@anxionos/contracts/portfolios";

export function createPortfolioCreatedEvent(input: {
	portfolioId: string;
	organizationId: string;
	ownerUserId: string;
	capitalAccountId: string;
	name: string;
	baseCurrency: string;
	executionMode: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.PORTFOLIO_CREATED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createValuationConfirmedEvent(input: {
	snapshotId: string;
	portfolioId: string;
	organizationId: string;
	asOf: string;
	valuationVersion: number;
	navBase: string;
	baseCurrency: string;
	qualityFlags: string[];
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.VALUATION_CONFIRMED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPositionUpdatedEvent(input: {
	portfolioId: string;
	positionId: string;
	organizationId: string;
	instrumentId: string;
	positionSide: string;
	book: string;
	quantity: string;
	revision: number;
	fillId: string;
	side: string;
	provisionalCash?: boolean;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createReconciliationOpenedEvent(input: {
	caseId: string;
	organizationId: string;
	portfolioId: string;
	caseKind: string;
	positionId?: string;
	fillId?: string;
	journalEntryId?: string;
	evidence?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.RECONCILIATION_OPENED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createReconciliationResolvedEvent(input: {
	caseId: string;
	organizationId: string;
	portfolioId: string;
	caseKind: string;
	disposition: string;
	rationale: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.RECONCILIATION_RESOLVED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createCashReconciledEvent(input: {
	portfolioId: string;
	organizationId: string;
	positionId: string;
	journalEntryId: string;
	cashDelta: string;
	asset: string;
	fillId?: string;
	provisionalSettled: boolean;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PORTFOLIOS_EVENT_TYPES.CASH_RECONCILED,
		schemaVersion: "0.1.0",
		ownerDomain: PORTFOLIOS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
