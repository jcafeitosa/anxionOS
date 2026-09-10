import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T02_META = traversalMetaSchema.parse({
	traversalId: "T02",
	queryVersion: 1,
	name: "temporal.asOf",
	class: "kernel",
	cacheable: "never",
});
export const T02_INPUT_SCHEMA = z.object({
	validAt: z.string().datetime(),
});
export const T02_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
});

export type T02Input = z.infer<typeof T02_INPUT_SCHEMA>;
export type T02Output = z.infer<typeof T02_OUTPUT_SCHEMA>;
