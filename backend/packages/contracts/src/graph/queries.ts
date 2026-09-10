import { z } from "zod";
import { fieldMaskSchema, nodeKeySchema } from "./types";
export const nodeProjectionDtoSchema = z.object({
	nodeKey: nodeKeySchema,
	schemaVersion: z.number().int().positive(),
	ownerDomain: z.string(),
	status: z.string(),
	revision: z.number().int().positive(),
	projectionGeneration: z.number().int().nonnegative(),
	checkpoint: z.string(),
	recordedAt: z.string().datetime(),
	payload: z.record(z.string(), z.unknown()),
	stale: z.boolean(),
});
export const nodeGetResponseSchema = z.object({
	node: nodeProjectionDtoSchema,
	etag: z.string(),
});
export const nodeGetQuerySchema = z.object({
	minProjectionGeneration: z.coerce.number().int().nonnegative().optional(),
	validAt: z.string().datetime().optional(),
	knownAt: z.string().datetime().optional(),
});
export const NODES_BATCH_GET_MAX_KEYS = 50;
/** Route boundary: no max on keys — handler returns 422 TRAVERSAL_INPUT_INVALID. */
export const nodesBatchGetRouteBodySchema = z.object({
	keys: z.array(nodeKeySchema).min(1),
	minProjectionGeneration: z.number().int().positive().optional(),
	fieldMask: fieldMaskSchema.optional(),
});
export const nodesBatchGetInputSchema = z.object({
	keys: z.array(nodeKeySchema).min(1).max(NODES_BATCH_GET_MAX_KEYS),
	minProjectionGeneration: z.number().int().positive().optional(),
	fieldMask: fieldMaskSchema.optional(),
});
export const nodesBatchGetEntrySchema = z.object({
	nodeKey: nodeKeySchema,
	node: nodeProjectionDtoSchema.optional(),
});
export const nodesBatchGetResponseSchema = z.object({
	entries: z.array(nodesBatchGetEntrySchema),
	truncated: z.boolean().optional(),
});
export const neighborDirectionSchema = z.enum(["OUT", "IN", "BOTH"]);
export const graphNeighborEdgeSchema = z.object({
	edgeType: z.string().min(1),
	direction: z.enum(["OUT", "IN"]),
	targetNodeKey: nodeKeySchema,
});
export const neighborsTraversalInputSchema = z.object({
	startNodeKey: nodeKeySchema,
	edgeTypes: z.array(z.string().min(1)).optional(),
	direction: neighborDirectionSchema.default("OUT"),
	maxResults: z.number().int().min(1).max(50).default(20),
	validAt: z.string().datetime().optional(),
});
export const neighborsTraversalDataSchema = z.object({
	startNodeKey: nodeKeySchema,
	neighbors: z.array(graphNeighborEdgeSchema),
	truncated: z.boolean().optional(),
});

export type NodeProjectionDto = z.infer<typeof nodeProjectionDtoSchema>;
export type NodeGetResponse = z.infer<typeof nodeGetResponseSchema>;
export type NodeGetQuery = z.infer<typeof nodeGetQuerySchema>;
export type NodesBatchGetInput = z.infer<typeof nodesBatchGetInputSchema>;
export type NodesBatchGetResponse = z.infer<typeof nodesBatchGetResponseSchema>;

export type NeighborDirection = z.infer<typeof neighborDirectionSchema>;
export type GraphNeighborEdge = z.infer<typeof graphNeighborEdgeSchema>;
export type NeighborsTraversalInput = z.infer<
	typeof neighborsTraversalInputSchema
>;
export type NeighborsTraversalData = z.infer<
	typeof neighborsTraversalDataSchema
>;
