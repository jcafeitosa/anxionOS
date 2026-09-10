import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T17_META = traversalMetaSchema.parse({
	traversalId: "T17",
	queryVersion: 1,
	name: "usage.costs",
	class: "domain",
	cacheable: "never",
});

export const T17_INPUT_SCHEMA = z.object({
	scopeNodeKey: nodeKeySchema,
	intervalStart: z.string().datetime(),
	intervalEnd: z.string().datetime(),
	validAt: z.string().datetime(),
});

export const T17_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	totalCostUsd: z.number().nullable(),
	usageRecordIds: z.array(z.string().uuid()),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T17Input = z.infer<typeof T17_INPUT_SCHEMA>;
export type T17Output = z.infer<typeof T17_OUTPUT_SCHEMA>;
