import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T13_META = traversalMetaSchema.parse({
    traversalId: "T13",
    queryVersion: 1,
    name: "risk.limits",
    class: "domain",
    cacheable: "never",
});
export const T13_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T13_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T13Input = z.infer<typeof T13_INPUT_SCHEMA>;
export type T13Output = z.infer<typeof T13_OUTPUT_SCHEMA>;
