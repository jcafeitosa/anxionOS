import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  RISK_EVENT_TYPES,
  RISK_OWNER_DOMAIN,
} from "@anxionos/contracts/risk";

export function createCheckCompletedEvent(input: {
  checkId: string;
  organizationId: string;
  portfolioId: string;
  intentHash: string;
  checkResult: string;
  denyReasonCode?: string;
  notionalAmount: string;
  authorityEpoch: number;
  riskEpoch: number;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: RISK_EVENT_TYPES.CHECK_COMPLETED,
    schemaVersion: "0.1.0",
    ownerDomain: RISK_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createPermitIssuedEvent(input: {
  permitId: string;
  checkId: string;
  organizationId: string;
  intentHash: string;
  authorityEpoch: number;
  riskEpoch: number;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: RISK_EVENT_TYPES.PERMIT_ISSUED,
    schemaVersion: "0.1.0",
    ownerDomain: RISK_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
