import { z } from "zod";
import { auditFlightRecorderEntryIdSchema, auditManifestIdSchema, payloadHashSchema } from "./types";
export const auditCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    manifestId: auditManifestIdSchema.optional(),
    flightRecordId: auditFlightRecorderEntryIdSchema.optional(),
});
export const ingestDomainEventTapCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    sourceEventId: z.string().uuid(),
    ownerDomain: z.string().min(1),
    eventType: z.string().min(1),
    occurredAt: z.string().datetime(),
    payloadHash: payloadHashSchema,
});

export type AuditCommandResult = z.infer<typeof auditCommandResultSchema>;

export type IngestDomainEventTapCommand = z.infer<typeof ingestDomainEventTapCommandSchema>;
