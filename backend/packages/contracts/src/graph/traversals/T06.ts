import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T06_META = traversalMetaSchema.parse({
    traversalId: "T06",
    queryVersion: 1,
    name: "context.budget",
    class: "domain",
    cacheable: "never",
});
export const T06_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T06_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T06Input = z.infer<typeof T06_INPUT_SCHEMA>;
export type T06Output = z.infer<typeof T06_OUTPUT_SCHEMA>;
