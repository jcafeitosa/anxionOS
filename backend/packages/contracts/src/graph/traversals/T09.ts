import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T09_META = traversalMetaSchema.parse({
	traversalId: "T09",
	queryVersion: 1,
	name: "exposure.byAsset",
	class: "domain",
	cacheable: "never",
});

export const T09_INPUT_SCHEMA = z.object({
	scopeNodeKey: nodeKeySchema,
	assetId: institutionalUuidSchema,
	validAt: z.string().datetime(),
});

export const T09_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	grossExposure: z.number().nullable(),
	netExposure: z.number().nullable(),
	unvalued: z.boolean(),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T09Input = z.infer<typeof T09_INPUT_SCHEMA>;
export type T09Output = z.infer<typeof T09_OUTPUT_SCHEMA>;
