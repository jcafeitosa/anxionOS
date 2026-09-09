import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  EXECUTION_MODULE_EVENT_TYPES,
  EXECUTION_OWNER_DOMAIN,
} from "@anxionos/contracts/execution";

export function createSessionOpenedEvent(input: {
  sessionId: string;
  organizationId: string;
  intentHash: string;
  riskPermitId: string;
  authorityEpoch: number;
  riskEpoch: number;
  executionMode: string;
  venueAdapterRefId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: EXECUTION_MODULE_EVENT_TYPES.SESSION_OPENED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createOrderSubmittedEvent(input: {
  orderId: string;
  sessionId: string;
  organizationId: string;
  clientOrderId: string;
  instrumentId: string;
  side: string;
  quantity: string;
  price: string;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: EXECUTION_MODULE_EVENT_TYPES.ORDER_SUBMITTED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createFillConfirmedEvent(input: {
  eventId: string;
  organizationId: string;
  fillId: string;
  orderId: string;
  side: string;
  instrumentId: string;
  quantity: string;
  price: string;
  notionalAmount: string;
  asset: string;
  filledAt: string;
  executionMode: string;
  capitalAccountId?: string;
  portfolioId?: string;
}): DomainEventEnvelope {
  return {
    eventId: input.eventId,
    eventType: EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
