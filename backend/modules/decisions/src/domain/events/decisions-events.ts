import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  DECISIONS_EVENT_TYPES,
  DECISIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/decisions";

export function createProposalCreatedEvent(input: {
  decisionId: string;
  proposalId: string;
  organizationId: string;
  grantId: string;
  expectedAuthorityEpoch: number;
  proposalKind: string;
  correlationId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.PROPOSAL_CREATED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createAuthorityCheckedEvent(input: {
  decisionId: string;
  organizationId: string;
  grantId: string;
  authorityEpoch: number;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.AUTHORITY_CHECKED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createIntentSubmittedEvent(input: {
  decisionId: string;
  intentId: string;
  organizationId: string;
  intentHash: string;
  instrumentId: string;
  side: string;
  quantity: string;
  price: string;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.INTENT_SUBMITTED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
