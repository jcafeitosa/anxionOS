import { z } from "zod";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T12_META = traversalMetaSchema.parse({
    traversalId: "T12",
    queryVersion: 1,
    name: "risk.exposure",
    class: "domain",
    cacheable: "never",
});
export const T12_INPUT_SCHEMA = z.object({
    validAt: z.string().datetime(),
});
export const T12_OUTPUT_SCHEMA = z.object({
    complete: z.boolean(),
});

export type T12Input = z.infer<typeof T12_INPUT_SCHEMA>;
export type T12Output = z.infer<typeof T12_OUTPUT_SCHEMA>;
