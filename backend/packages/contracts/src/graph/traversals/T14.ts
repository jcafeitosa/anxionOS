import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T14_META = traversalMetaSchema.parse({
    traversalId: "T14",
    queryVersion: 1,
    name: "mandate.check",
    class: "domain",
    cacheable: "never",
});
export const T14_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T14_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T14Input = z.infer<typeof T14_INPUT_SCHEMA>;
export type T14Output = z.infer<typeof T14_OUTPUT_SCHEMA>;
