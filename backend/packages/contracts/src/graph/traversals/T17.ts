import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T17_META = traversalMetaSchema.parse({
    traversalId: "T17",
    queryVersion: 1,
    name: "audit.trail",
    class: "domain",
    cacheable: "never",
});
export const T17_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T17_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T17Input = z.infer<typeof T17_INPUT_SCHEMA>;
export type T17Output = z.infer<typeof T17_OUTPUT_SCHEMA>;
