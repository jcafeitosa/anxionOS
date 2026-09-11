import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	auditFlightRecorderEntryIdSchema,
	auditManifestIdSchema,
	payloadHashSchema,
} from "./types";
export const auditCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	manifestId: auditManifestIdSchema.optional(),
	flightRecordId: auditFlightRecorderEntryIdSchema.optional(),
});
export const ingestDomainEventTapCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	sourceEventId: institutionalUuidSchema,
	ownerDomain: z.string().min(1),
	eventType: z.string().min(1),
	occurredAt: z.string().datetime(),
	payloadHash: payloadHashSchema,
});

export type AuditCommandResult = z.infer<typeof auditCommandResultSchema>;

export type IngestDomainEventTapCommand = z.infer<
	typeof ingestDomainEventTapCommandSchema
>;

export const verifyManifestIntegrityCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	manifestId: auditManifestIdSchema,
	payloadHash: payloadHashSchema,
});
export const verifyManifestIntegrityResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	manifestId: auditManifestIdSchema,
	integrity: z.literal("verified"),
	idempotentReplay: z.boolean().optional(),
});
export type VerifyManifestIntegrityCommand = z.infer<
	typeof verifyManifestIntegrityCommandSchema
>;
export type VerifyManifestIntegrityResult = z.infer<
	typeof verifyManifestIntegrityResultSchema
>;
