import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T07_META = traversalMetaSchema.parse({
	traversalId: "T07",
	queryVersion: 1,
	name: "capital.underAgent",
	class: "hybrid",
	cacheable: "never",
});

export const T07_INPUT_SCHEMA = z.object({
	agentNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T07_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	portfolioIds: z.array(institutionalUuidSchema),
	accountIds: z.array(institutionalUuidSchema),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T07Input = z.infer<typeof T07_INPUT_SCHEMA>;
export type T07Output = z.infer<typeof T07_OUTPUT_SCHEMA>;
