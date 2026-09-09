import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  ACCOUNTING_EVENT_TYPES,
  ACCOUNTING_OWNER_DOMAIN,
} from "@anxionos/contracts/accounting";

export function createLedgerPostedEvent(input: {
  entryId: string;
  organizationId: string;
  idempotencyKey: string;
  entryKind: string;
  linesSummary: Array<{
    accountCode: string;
    debit: string;
    credit: string;
    asset: string;
    amount: string;
  }>;
  valueDate: string;
  capitalAccountId?: string;
  portfolioId?: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: ACCOUNTING_EVENT_TYPES.LEDGER_POSTED,
    schemaVersion: "0.1.0",
    ownerDomain: ACCOUNTING_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
