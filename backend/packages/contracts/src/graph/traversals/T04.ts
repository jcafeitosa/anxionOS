import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T04_META = traversalMetaSchema.parse({
	traversalId: "T04",
	queryVersion: 1,
	name: "context.scope",
	class: "domain",
	cacheable: "never",
});
export const T04_INPUT_SCHEMA = z.object({
	validAt: z.string().datetime(),
});
export const T04_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
});

export type T04Input = z.infer<typeof T04_INPUT_SCHEMA>;
export type T04Output = z.infer<typeof T04_OUTPUT_SCHEMA>;
