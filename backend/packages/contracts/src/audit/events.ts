import { z } from "zod";
import { auditFlightRecorderEntryIdSchema, auditManifestIdSchema, payloadHashSchema } from "./types";
export const AUDIT_EVENT_TYPES = {
    MANIFEST_RECORDED: "audit.manifest.recorded.v1",
};
export const manifestRecordedPayloadSchema = z.object({
    manifestId: auditManifestIdSchema,
    flightRecordId: auditFlightRecorderEntryIdSchema,
    organizationId: z.string().uuid(),
    sourceEventId: z.string().uuid(),
    ownerDomain: z.string().min(1),
    eventType: z.string().min(1),
    occurredAt: z.string().datetime(),
    payloadHash: payloadHashSchema,
    recordedAt: z.string().datetime(),
});
export const auditEventPayloadSchema = z.discriminatedUnion("eventType", [
    z.object({
        eventType: z.literal(AUDIT_EVENT_TYPES.MANIFEST_RECORDED),
        payload: manifestRecordedPayloadSchema,
    }),
]);

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[keyof typeof AUDIT_EVENT_TYPES];
