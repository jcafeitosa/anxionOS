import { z } from "zod";
import { graphSchemaStatusSchema } from "./node-types";
export const edgeTypeDefSchema = z.object({
	edgeTypeId: z.string().min(1).max(128),
	edgeType: z.string().min(1).max(64),
	schemaVersion: z.number().int().positive(),
	fromNodeTypes: z.array(z.string().min(1)).min(1),
	toNodeTypes: z.array(z.string().min(1)).min(1),
	writerDomain: z.string().min(1),
	cardinality: z.enum([
		"one-to-one",
		"one-to-many",
		"many-to-one",
		"many-to-many",
	]),
	temporal: z.boolean(),
	crossScopePolicy: z.enum(["same-scope", "cross-scope-allowed", "forbidden"]),
	status: graphSchemaStatusSchema,
});
export type EdgeTypeDef = z.infer<typeof edgeTypeDefSchema>;
export const GRAPH_F0_EDGE_TYPES = [
	{
		edgeTypeId: "membership.user",
		edgeType: "HAS_MEMBERSHIP",
		schemaVersion: 1,
		fromNodeTypes: ["User"],
		toNodeTypes: ["Membership"],
		writerDomain: "organizations",
		cardinality: "one-to-many",
		temporal: true,
		crossScopePolicy: "same-scope",
		status: "active",
	},
	{
		edgeTypeId: "agency.membership",
		edgeType: "AGENCY_MEMBERSHIP",
		schemaVersion: 1,
		fromNodeTypes: ["Agency"],
		toNodeTypes: ["Membership"],
		writerDomain: "organizations",
		cardinality: "one-to-many",
		temporal: true,
		crossScopePolicy: "same-scope",
		status: "active",
	},
	{
		edgeTypeId: "grant.subject",
		edgeType: "HAS_GRANT",
		schemaVersion: 1,
		fromNodeTypes: ["User", "Membership"],
		toNodeTypes: ["Grant"],
		writerDomain: "governance",
		cardinality: "one-to-many",
		temporal: true,
		crossScopePolicy: "cross-scope-allowed",
		status: "active",
	},
] satisfies readonly EdgeTypeDef[];
