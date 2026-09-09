import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  PERFORMANCE_EVENT_TYPES,
  PERFORMANCE_OWNER_DOMAIN,
} from "@anxionos/contracts/performance";

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
