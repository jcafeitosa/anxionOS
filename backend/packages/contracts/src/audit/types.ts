import { z } from "zod";
export const AUDIT_OWNER_DOMAIN = "audit";
export const auditManifestIdSchema = z
	.string()
	.regex(/^aud_man_[0-9a-f-]{36}$/i);
export const auditFlightRecorderEntryIdSchema = z
	.string()
	.regex(/^aud_rec_[0-9a-f-]{36}$/i);
export const payloadHashSchema = z.string().regex(/^[0-9a-f]{64}$/i);

export type AuditManifestId = z.infer<typeof auditManifestIdSchema>;
export type AuditFlightRecorderEntryId = z.infer<
	typeof auditFlightRecorderEntryIdSchema
>;
