import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  EVALUATION_EVENT_TYPES,
  EVALUATION_OWNER_DOMAIN,
} from "@anxionos/contracts/evaluation";

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
