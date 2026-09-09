import { z } from "zod";
import { emailAddressSchema, principalIdSchema, principalStatusSchema, } from "./types";
/** Public DTO — no authUserId (HTTP boundary only). */
export const principalDtoSchema = z.object({
    id: principalIdSchema,
    email: emailAddressSchema,
    status: principalStatusSchema,
    createdAt: z.string().datetime(),
    suspendedAt: z.string().datetime().optional(),
});

export type PrincipalDto = z.infer<typeof principalDtoSchema>;
