import { z } from "zod";
import { reasonNodeSchema, traversalMetaSchema } from "./common";
import { T01_INPUT_SCHEMA } from "./T01";
export const TRAVERSAL_T03_META = traversalMetaSchema.parse({
	traversalId: "T03",
	queryVersion: 1,
	name: "authorization.explain",
	class: "kernel",
	cacheable: "conditional",
});
export const T03_INPUT_SCHEMA = T01_INPUT_SCHEMA;
export const T03_OUTPUT_SCHEMA = z.object({
	decision: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]),
	authorityEpoch: z.number().int().nonnegative().optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
	reasonTree: z.array(reasonNodeSchema),
});

export type T03Input = z.infer<typeof T03_INPUT_SCHEMA>;
export type T03Output = z.infer<typeof T03_OUTPUT_SCHEMA>;
