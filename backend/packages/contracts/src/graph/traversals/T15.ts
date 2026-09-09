import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T15_META = traversalMetaSchema.parse({
    traversalId: "T15",
    queryVersion: 1,
    name: "connections.listModels",
    class: "kernel",
    cacheable: "conditional",
});
export const T15_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T15_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T15Input = z.infer<typeof T15_INPUT_SCHEMA>;
export type T15Output = z.infer<typeof T15_OUTPUT_SCHEMA>;
