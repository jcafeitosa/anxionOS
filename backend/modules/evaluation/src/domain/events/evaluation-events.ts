import { randomUUID } from "node:crypto";
import {
	EVALUATION_EVENT_TYPES,
	EVALUATION_OWNER_DOMAIN,
} from "@anxionos/contracts/evaluation";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createCertificationIssuedEvent(input: {
	certificationId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	evaluationRecordId?: string;
	policyHash?: string;
	issuedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: EVALUATION_EVENT_TYPES.CERTIFICATION_ISSUED,
		schemaVersion: "0.1.0",
		ownerDomain: EVALUATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: {
			certificationId: input.certificationId,
			organizationId: input.organizationId,
			subjectType: "strategy_version",
			strategyId: input.strategyId,
			strategyVersionId: input.strategyVersionId,
			evaluationRecordId: input.evaluationRecordId,
			policyHash: input.policyHash,
			issuedAt: input.issuedAt,
		},
	};
}

export function createScoreComputedEvent(input: {
	evaluationRecordId: string;
	evaluationScoreId: string;
	organizationId: string;
	outcomeSnapshotId: string;
	scoreMetric: string;
	scoreValue: string;
	computedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: EVALUATION_EVENT_TYPES.SCORE_COMPUTED,
		schemaVersion: "0.1.0",
		ownerDomain: EVALUATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
