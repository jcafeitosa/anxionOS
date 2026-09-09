export interface ReasonNode {
    stage: string;
    decision?: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "SKIP";
    message?: string;
    children?: ReasonNode[];
}

import { z } from "zod";
export const traversalMetaSchema = z.object({
    traversalId: z.string().regex(/^T\d{2}$/),
    queryVersion: z.number().int().positive(),
    name: z.string().min(1),
    class: z.enum(["kernel", "hybrid", "domain"]),
    cacheable: z.enum(["never", "conditional", "always"]),
});
export const reasonNodeSchema: z.ZodType<ReasonNode> = z.lazy(() => z.object({
    stage: z.string(),
    decision: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL", "SKIP"]).optional(),
    message: z.string().optional(),
    children: z.array(reasonNodeSchema).optional(),
}));

export type TraversalMeta = z.infer<typeof traversalMetaSchema>;
