import { z } from "zod";
import { domainEventEnvelopeSchema } from "../events";
import { payloadHashSchema } from "./types";
import { institutionalUuidSchema } from "../institutional-uuid";
/** Bridge schema for audit ingest input shaped as a domain event tap envelope. */
export const domainEventTapBridgeSchema = domainEventEnvelopeSchema
	.pick({
		eventId: true,
		ownerDomain: true,
		eventType: true,
		occurredAt: true,
	})
	.extend({
		organizationId: institutionalUuidSchema,
		payloadHash: payloadHashSchema,
	});
export function mapDomainEventTapToAuditInput(
	tap: DomainEventTapBridge,
	commandId: string,
): IngestDomainEventTapFromBridgeInput {
	const parsed = domainEventTapBridgeSchema.parse(tap);
	return {
		commandId,
		organizationId: parsed.organizationId,
		sourceEventId: parsed.eventId,
		ownerDomain: parsed.ownerDomain,
		eventType: parsed.eventType,
		occurredAt: parsed.occurredAt,
		payloadHash: parsed.payloadHash,
	};
}

export type DomainEventTapBridge = z.infer<typeof domainEventTapBridgeSchema>;
export interface IngestDomainEventTapFromBridgeInput {
	commandId: string;
	organizationId: string;
	sourceEventId: string;
	ownerDomain: string;
	eventType: string;
	occurredAt: string;
	payloadHash: string;
}
