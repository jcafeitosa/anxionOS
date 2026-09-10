import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T14_META = traversalMetaSchema.parse({
	traversalId: "T14",
	queryVersion: 1,
	name: "connection.revokeImpact",
	class: "kernel",
	cacheable: "never",
});

export const T14_INPUT_SCHEMA = z.object({
	connectionNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T14_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	impactedBindingIds: z.array(z.string().uuid()),
	impactedInferenceRequestIds: z.array(z.string().uuid()),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T14Input = z.infer<typeof T14_INPUT_SCHEMA>;
export type T14Output = z.infer<typeof T14_OUTPUT_SCHEMA>;
