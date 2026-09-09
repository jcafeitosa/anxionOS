import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T11_META = traversalMetaSchema.parse({
    traversalId: "T11",
    queryVersion: 1,
    name: "lineage.downstream",
    class: "domain",
    cacheable: "never",
});
export const T11_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T11_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T11Input = z.infer<typeof T11_INPUT_SCHEMA>;
export type T11Output = z.infer<typeof T11_OUTPUT_SCHEMA>;
