import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  BILLING_EVENT_TYPES,
  BILLING_OWNER_DOMAIN,
} from "@anxionos/contracts/billing";

export function createInvoiceIssuedEvent(input: {
  invoiceId: string;
  organizationId: string;
  subscriptionId: string;
  billingPeriod: string;
  totalAmount: string;
  issuedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: BILLING_EVENT_TYPES.INVOICE_ISSUED,
    schemaVersion: "0.1.0",
    ownerDomain: BILLING_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
