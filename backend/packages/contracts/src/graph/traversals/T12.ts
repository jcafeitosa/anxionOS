import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T12_META = traversalMetaSchema.parse({
	traversalId: "T12",
	queryVersion: 1,
	name: "outcome.attribution",
	class: "kernel",
	cacheable: "never",
});

export const T12_INPUT_SCHEMA = z.object({
	outcomeNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T12_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	fillIds: z.array(institutionalUuidSchema),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T12Input = z.infer<typeof T12_INPUT_SCHEMA>;
export type T12Output = z.infer<typeof T12_OUTPUT_SCHEMA>;
