import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T20_META = traversalMetaSchema.parse({
	traversalId: "T20",
	queryVersion: 1,
	name: "commercial.attribution",
	class: "domain",
	cacheable: "never",
});

export const T20_INPUT_SCHEMA = z.object({
	referralNodeKey: nodeKeySchema,
	validAt: z.string().datetime(),
});

export const T20_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	commissionIds: z.array(institutionalUuidSchema),
	invoiceIds: z.array(institutionalUuidSchema),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T20Input = z.infer<typeof T20_INPUT_SCHEMA>;
export type T20Output = z.infer<typeof T20_OUTPUT_SCHEMA>;
