import { z } from "zod";
/** Institutional domain event envelope (P02 baseline). */
export const domainEventEnvelopeSchema = z.object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal("0.1.0"),
    ownerDomain: z.string().min(1),
    eventType: z.string().min(1),
    occurredAt: z.string().datetime(),
    payload: z.unknown(),
});
export function parseDomainEventEnvelope(input: unknown): DomainEventEnvelope {
    return domainEventEnvelopeSchema.parse(input);
}

export type DomainEventEnvelope = z.infer<typeof domainEventEnvelopeSchema>;
