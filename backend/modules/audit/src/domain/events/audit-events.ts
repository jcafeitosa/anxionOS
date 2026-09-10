import { randomUUID } from "node:crypto";
import {
	AUDIT_EVENT_TYPES,
	AUDIT_OWNER_DOMAIN,
} from "@anxionos/contracts/audit";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createManifestRecordedEvent(input: {
	manifestId: string;
	flightRecordId: string;
	organizationId: string;
	sourceEventId: string;
	ownerDomain: string;
	eventType: string;
	occurredAt: string;
	payloadHash: string;
	recordedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: AUDIT_EVENT_TYPES.MANIFEST_RECORDED,
		schemaVersion: "0.1.0",
		ownerDomain: AUDIT_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
