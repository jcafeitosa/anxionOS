import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T05_META = traversalMetaSchema.parse({
    traversalId: "T05",
    queryVersion: 1,
    name: "context.buildForAgent",
    class: "hybrid",
    cacheable: "never",
});
export const T05_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T05_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T05Input = z.infer<typeof T05_INPUT_SCHEMA>;
export type T05Output = z.infer<typeof T05_OUTPUT_SCHEMA>;
