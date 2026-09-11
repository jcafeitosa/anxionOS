import { z } from "zod";
import { institutionalUuidSchema } from "./institutional-uuid";
/** Institutional domain event envelope (P02 baseline). */
export const domainEventEnvelopeSchema = z.object({
	eventId: institutionalUuidSchema,
	schemaVersion: z.literal("0.1.0"),
	ownerDomain: z.string().min(1),
	eventType: z.string().min(1),
	occurredAt: z.string().datetime(),
	/** Present for agency-scoped domains; used by NATS subject isolation. */
	agencyId: institutionalUuidSchema.optional(),
	payload: z.unknown(),
});
export function parseDomainEventEnvelope(input: unknown): DomainEventEnvelope {
	return domainEventEnvelopeSchema.parse(input);
}

export type DomainEventEnvelope = z.infer<typeof domainEventEnvelopeSchema>;
const TENANT_SCOPED_OWNER_DOMAINS = new Set(["organizations"]);

function readPayloadAgencyId(payload: unknown): string | undefined {
	if (
		typeof payload !== "object" ||
		payload === null ||
		!("agencyId" in payload)
	) {
		return undefined;
	}
	const agencyId = (payload as { agencyId: unknown }).agencyId;
	return typeof agencyId === "string" ? agencyId : undefined;
}

/** Fail-fast when tenant-scoped envelopes omit or mismatch envelope.agencyId vs payload.agencyId. */
export function assertTenantScopedEnvelopeAgencyId(
	envelope: DomainEventEnvelope,
): void {
	if (!TENANT_SCOPED_OWNER_DOMAINS.has(envelope.ownerDomain)) {
		return;
	}
	const payloadAgencyId = readPayloadAgencyId(envelope.payload);
	if (!envelope.agencyId) {
		throw new Error(
			`Tenant-scoped event missing envelope.agencyId: ${envelope.eventType}`,
		);
	}
	if (!payloadAgencyId) {
		throw new Error(
			`Tenant-scoped event payload missing agencyId: ${envelope.eventType}`,
		);
	}
	if (payloadAgencyId !== envelope.agencyId) {
		throw new Error(
			`Tenant-scoped event agencyId mismatch: envelope=${envelope.agencyId} payload=${payloadAgencyId}`,
		);
	}
}
