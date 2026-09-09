import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T09_META = traversalMetaSchema.parse({
    traversalId: "T09",
    queryVersion: 1,
    name: "explore.path",
    class: "domain",
    cacheable: "never",
});
export const T09_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T09_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T09Input = z.infer<typeof T09_INPUT_SCHEMA>;
export type T09Output = z.infer<typeof T09_OUTPUT_SCHEMA>;
