import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	PERFORMANCE_EVENT_TYPES,
	PERFORMANCE_OWNER_DOMAIN,
} from "@anxionos/contracts/performance";

export function createMetricSnapshotEvent(input: {
	metricSeriesId: string;
	organizationId: string;
	outcomeSnapshotId?: string;
	positionExposureSnapshotId?: string;
	metricName: string;
	metricValue: string;
	observedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PERFORMANCE_EVENT_TYPES.METRIC_SNAPSHOT,
		schemaVersion: "0.1.0",
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPositionExposureRecordedEvent(input: {
	positionExposureSnapshotId: string;
	organizationId: string;
	portfolioId: string;
	positionId: string;
	revision: number;
	instrumentId: string;
	positionSide: string;
	book: string;
	quantity: string;
	fillId: string;
	side: string;
	provisionalCash: boolean;
	observedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PERFORMANCE_EVENT_TYPES.POSITION_EXPOSURE_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createOutcomeRecordedEvent(input: {
	outcomeSnapshotId: string;
	organizationId: string;
	journalEntryId: string;
	valueDate: string;
	linesSummary: Array<{
		accountCode: string;
		debit: string;
		credit: string;
		asset: string;
		amount: string;
	}>;
	recordedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: PERFORMANCE_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
