import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T19_META = traversalMetaSchema.parse({
	traversalId: "T19",
	queryVersion: 1,
	name: "simulation.authorityDiff",
	class: "domain",
	cacheable: "never",
});

export const T19_INPUT_SCHEMA = z.object({
	snapshotNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T19_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	requiredApprovalIds: z.array(z.string().uuid()),
	staleBaseline: z.boolean(),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T19Input = z.infer<typeof T19_INPUT_SCHEMA>;
export type T19Output = z.infer<typeof T19_OUTPUT_SCHEMA>;
