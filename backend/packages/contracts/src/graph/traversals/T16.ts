import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T16_META = traversalMetaSchema.parse({
	traversalId: "T16",
	queryVersion: 1,
	name: "routing.trace",
	class: "domain",
	cacheable: "never",
});

export const T16_INPUT_SCHEMA = z.object({
	inferenceRequestNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T16_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	attemptIds: z.array(institutionalUuidSchema),
	routingDecisionIds: z.array(institutionalUuidSchema),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T16Input = z.infer<typeof T16_INPUT_SCHEMA>;
export type T16Output = z.infer<typeof T16_OUTPUT_SCHEMA>;
