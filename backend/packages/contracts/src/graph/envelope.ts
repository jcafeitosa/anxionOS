import { z } from "zod";
import {
	freshnessSchema,
	nodeKeySchema,
	scopeContextSchema,
	temporalContextSchema,
} from "./types";
export const graphQueryEnvelopeSchema = z.object({
	clientQueryId: z.string().uuid().optional(),
	scope: scopeContextSchema,
	temporal: temporalContextSchema,
	freshness: freshnessSchema.optional(),
	params: z.record(z.string(), z.unknown()),
});
export const graphQueryMetaSchema = z.object({
	queryId: z.string().uuid(),
	traversalId: z.string(),
	queryVersion: z.number().int().positive(),
	requestId: z.string().optional(),
	validAt: z.string().datetime(),
	knownAt: z.string().datetime().optional(),
	projectionGeneration: z.number().int().nonnegative(),
	checkpoint: z.string(),
	complete: z.boolean(),
	reasons: z.array(z.string()).optional(),
	cursor: z.string().optional(),
	stale: z.boolean().optional(),
	cached: z.boolean().optional(),
	cacheAgeMs: z.number().int().nonnegative().optional(),
});
export const graphQueryResultSchema = z.object({
	meta: graphQueryMetaSchema,
	data: z.unknown(),
});
export const commandAcceptedSchema = z.object({
	commandId: z.string().uuid(),
	ownerDomain: z.string(),
	projectionPending: z.literal(true),
	acceptedAt: z.string().datetime(),
	nodeKey: nodeKeySchema.optional(),
	expectedProjectionGeneration: z.number().int().nonnegative().optional(),
});
export const commandProjectedSchema = commandAcceptedSchema.extend({
	projectionPending: z.literal(false),
	projectedAt: z.string().datetime(),
	projectionGeneration: z.number().int().nonnegative(),
});

export type GraphQueryEnvelope = z.infer<typeof graphQueryEnvelopeSchema>;
export type GraphQueryMeta = z.infer<typeof graphQueryMetaSchema>;
export type GraphQueryResult = z.infer<typeof graphQueryResultSchema>;
export type CommandAccepted = z.infer<typeof commandAcceptedSchema>;
export type CommandProjected = z.infer<typeof commandProjectedSchema>;
