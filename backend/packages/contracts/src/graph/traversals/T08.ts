import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T08_META = traversalMetaSchema.parse({
    traversalId: "T08",
    queryVersion: 1,
    name: "explore.neighbors",
    class: "hybrid",
    cacheable: "never",
});
export const T08_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T08_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T08Input = z.infer<typeof T08_INPUT_SCHEMA>;
export type T08Output = z.infer<typeof T08_OUTPUT_SCHEMA>;
