import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T06_META = traversalMetaSchema.parse({
	traversalId: "T06",
	queryVersion: 1,
	name: "goal.dependencies",
	class: "domain",
	cacheable: "never",
});

export const T06_INPUT_SCHEMA = z.object({
	goalNodeKey: nodeKeySchema,
	maxDepth: z.number().int().min(1).max(12).default(6),
	validAt: z.string().datetime(),
});

export const T06_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	dependencyTaskIds: z.array(z.string().uuid()),
	blockedTaskIds: z.array(z.string().uuid()),
	hasCycle: z.boolean(),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T06Input = z.infer<typeof T06_INPUT_SCHEMA>;
export type T06Output = z.infer<typeof T06_OUTPUT_SCHEMA>;
