import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T20_META = traversalMetaSchema.parse({
    traversalId: "T20",
    queryVersion: 1,
    name: "health.consistency",
    class: "domain",
    cacheable: "never",
});
export const T20_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T20_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T20Input = z.infer<typeof T20_INPUT_SCHEMA>;
export type T20Output = z.infer<typeof T20_OUTPUT_SCHEMA>;
