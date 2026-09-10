import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T10_META = traversalMetaSchema.parse({
	traversalId: "T10",
	queryVersion: 1,
	name: "lineage.upstream",
	class: "domain",
	cacheable: "never",
});

export const T10_INPUT_SCHEMA = z.object({
	decisionNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T10_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	agentIds: z.array(z.string().uuid()),
	knowledgeRefIds: z.array(z.string().uuid()),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T10Input = z.infer<typeof T10_INPUT_SCHEMA>;
export type T10Output = z.infer<typeof T10_OUTPUT_SCHEMA>;
