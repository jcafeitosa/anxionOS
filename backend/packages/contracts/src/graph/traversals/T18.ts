import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T18_META = traversalMetaSchema.parse({
	traversalId: "T18",
	queryVersion: 1,
	name: "reconciliation.openCases",
	class: "domain",
	cacheable: "never",
});

export const T18_INPUT_SCHEMA = z.object({
	resourceNodeKey: nodeKeySchema,
	status: z.enum(["OPEN", "RESOLVED"]).default("OPEN"),
	validAt: z.string().datetime(),
});

export const T18_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	caseIds: z.array(institutionalUuidSchema),
	differenceUsd: z.number().nullable(),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T18Input = z.infer<typeof T18_INPUT_SCHEMA>;
export type T18Output = z.infer<typeof T18_OUTPUT_SCHEMA>;
