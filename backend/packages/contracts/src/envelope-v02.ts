import { z } from "zod";
import { institutionalUuidSchema } from "./institutional-uuid";
/** Institutional envelope schema version (P02 Wave 2). */
export const INSTITUTIONAL_SCHEMA_VERSION_V02 = "0.2.0";
export const institutionalChannelSchema = z.enum([
	"ui",
	"sdk",
	"worker",
	"system",
]);
const institutionalEnvelopeCoreV02Schema = z.object({
	messageId: institutionalUuidSchema,
	messageType: z.string().min(1),
	schemaVersion: z.literal(INSTITUTIONAL_SCHEMA_VERSION_V02),
	occurredAt: z.string().datetime(),
	correlationId: institutionalUuidSchema,
	causationId: institutionalUuidSchema.optional(),
	actorPrincipalId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema.optional(),
	tenantId: institutionalUuidSchema.optional(),
	channel: institutionalChannelSchema,
	aggregateId: institutionalUuidSchema.optional(),
	aggregateRevision: z.number().int().nonnegative().optional(),
	payload: z.unknown(),
});
export const domainEventEnvelopeV02Schema =
	institutionalEnvelopeCoreV02Schema.extend({
		ownerDomain: z.string().min(1),
		idempotencyKey: institutionalUuidSchema.optional(),
	});
export const domainCommandEnvelopeV02Schema =
	institutionalEnvelopeCoreV02Schema.extend({
		ownerDomain: z.string().min(1),
		idempotencyKey: institutionalUuidSchema,
	});
export function parseDomainEventEnvelopeV02(
	input: unknown,
): DomainEventEnvelopeV02 {
	return domainEventEnvelopeV02Schema.parse(input);
}
export function parseDomainCommandEnvelopeV02(
	input: unknown,
): DomainCommandEnvelopeV02 {
	return domainCommandEnvelopeV02Schema.parse(input);
}
export function upgradeDomainEventEnvelopeToV02(
	envelope: {
		eventId: string;
		schemaVersion: "0.1.0";
		ownerDomain: string;
		eventType: string;
		occurredAt: string;
		payload: unknown;
	},
	context: {
		correlationId: string;
		actorPrincipalId: string;
		channel: InstitutionalChannel;
		causationId?: string;
		agencyId?: string;
		tenantId?: string;
		aggregateId?: string;
		aggregateRevision?: number;
		idempotencyKey?: string;
	},
): DomainEventEnvelopeV02 {
	return domainEventEnvelopeV02Schema.parse({
		messageId: envelope.eventId,
		messageType: envelope.eventType,
		schemaVersion: INSTITUTIONAL_SCHEMA_VERSION_V02,
		occurredAt: envelope.occurredAt,
		ownerDomain: envelope.ownerDomain,
		correlationId: context.correlationId,
		causationId: context.causationId,
		actorPrincipalId: context.actorPrincipalId,
		agencyId: context.agencyId,
		tenantId: context.tenantId,
		channel: context.channel,
		aggregateId: context.aggregateId,
		aggregateRevision: context.aggregateRevision,
		idempotencyKey: context.idempotencyKey,
		payload: envelope.payload,
	});
}

export type InstitutionalChannel = z.infer<typeof institutionalChannelSchema>;

export type DomainEventEnvelopeV02 = z.infer<
	typeof domainEventEnvelopeV02Schema
>;

export type DomainCommandEnvelopeV02 = z.infer<
	typeof domainCommandEnvelopeV02Schema
>;
