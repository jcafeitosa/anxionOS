import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T11_META = traversalMetaSchema.parse({
	traversalId: "T11",
	queryVersion: 1,
	name: "fill.authorizationChain",
	class: "domain",
	cacheable: "never",
});

export const T11_INPUT_SCHEMA = z.object({
	fillNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T11_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	grantIds: z.array(institutionalUuidSchema),
	approvalAgentIds: z.array(institutionalUuidSchema),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T11Input = z.infer<typeof T11_INPUT_SCHEMA>;
export type T11Output = z.infer<typeof T11_OUTPUT_SCHEMA>;
