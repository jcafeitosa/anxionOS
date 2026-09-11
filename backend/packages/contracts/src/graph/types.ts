import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
export const GRAPH_OWNER_DOMAIN = "graph";
export const scopeTypeSchema = z.enum([
	"PLATFORM",
	"ORGANIZATION",
	"AGENCY",
	"USER",
	"PUBLIC",
]);
export const actingScopeTypeSchema = z.enum([
	"PLATFORM",
	"ORGANIZATION",
	"AGENCY",
	"USER",
]);
export const nodeKeySchema = z.object({
	scopeType: scopeTypeSchema,
	scopeId: institutionalUuidSchema,
	type: z.string().min(1).max(64),
	id: institutionalUuidSchema,
});
export const scopeContextSchema = z.object({
	principalId: institutionalUuidSchema,
	actingScope: z.object({
		scopeType: actingScopeTypeSchema,
		scopeId: institutionalUuidSchema,
	}),
});
export const temporalContextSchema = z.object({
	validAt: z.string().datetime(),
	knownAt: z.string().datetime().optional(),
});
export const freshnessSchema = z.object({
	minProjectionGeneration: z.number().int().nonnegative().optional(),
	acceptStale: z.boolean().default(false),
});
export const fieldMaskSchema = z.array(z.string().min(1)).max(64);

export type ScopeType = z.infer<typeof scopeTypeSchema>;
export type ActingScopeType = z.infer<typeof actingScopeTypeSchema>;
export type NodeKey = z.infer<typeof nodeKeySchema>;
export type ScopeContext = z.infer<typeof scopeContextSchema>;
export type TemporalContext = z.infer<typeof temporalContextSchema>;
export type Freshness = z.infer<typeof freshnessSchema>;
export type FieldMask = z.infer<typeof fieldMaskSchema>;
