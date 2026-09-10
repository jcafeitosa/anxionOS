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
