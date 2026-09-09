import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  OPERATIONS_EVENT_TYPES,
  OPERATIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/operations";

export function createIncidentOpenedEvent(input: {
  incidentId: string;
  organizationId: string;
  title: string;
  description?: string;
  severity: string;
  serviceId?: string;
  openedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: OPERATIONS_EVENT_TYPES.INCIDENT_OPENED,
    schemaVersion: "0.1.0",
    ownerDomain: OPERATIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createHealthDegradedEvent(input: {
  healthCheckId: string;
  organizationId: string;
  serviceId: string;
  status: string;
  checkedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: OPERATIONS_EVENT_TYPES.HEALTH_DEGRADED,
    schemaVersion: "0.1.0",
    ownerDomain: OPERATIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function isDegradedHealthStatus(status: string): boolean {
  return status === "DEGRADED" || status === "UNHEALTHY";
}
