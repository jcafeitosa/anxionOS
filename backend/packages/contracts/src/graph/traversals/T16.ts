import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T16_META = traversalMetaSchema.parse({
    traversalId: "T16",
    queryVersion: 1,
    name: "connections.masked",
    class: "domain",
    cacheable: "never",
});
export const T16_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T16_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T16Input = z.infer<typeof T16_INPUT_SCHEMA>;
export type T16Output = z.infer<typeof T16_OUTPUT_SCHEMA>;
