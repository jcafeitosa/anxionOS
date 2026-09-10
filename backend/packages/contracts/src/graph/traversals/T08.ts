import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T08_META = traversalMetaSchema.parse({
	traversalId: "T08",
	queryVersion: 1,
	name: "strategy.deployments",
	class: "hybrid",
	cacheable: "never",
});

export const T08_INPUT_SCHEMA = z.object({
	strategyNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T08_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	deploymentIds: z.array(z.string().uuid()),
	agentIds: z.array(z.string().uuid()),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T08Input = z.infer<typeof T08_INPUT_SCHEMA>;
export type T08Output = z.infer<typeof T08_OUTPUT_SCHEMA>;
