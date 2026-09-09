import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T18_META = traversalMetaSchema.parse({
    traversalId: "T18",
    queryVersion: 1,
    name: "evolution.diff",
    class: "domain",
    cacheable: "never",
});
export const T18_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T18_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T18Input = z.infer<typeof T18_INPUT_SCHEMA>;
export type T18Output = z.infer<typeof T18_OUTPUT_SCHEMA>;
