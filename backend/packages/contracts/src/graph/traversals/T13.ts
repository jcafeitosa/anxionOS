import { z } from "zod";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";

export const TRAVERSAL_T13_META = traversalMetaSchema.parse({
	traversalId: "T13",
	queryVersion: 1,
	name: "suspend.impact",
	class: "domain",
	cacheable: "never",
});

export const T13_INPUT_SCHEMA = z.object({
	subjectNodeKey: nodeKeySchema,
	action: z.enum(["SUSPEND_NEW_WORK", "SUSPEND_AGENT"]),
	validAt: z.string().datetime(),
});

export const T13_OUTPUT_SCHEMA = z.object({
	complete: z.boolean(),
	impactedAgentIds: z.array(z.string().uuid()),
	impactedDeploymentIds: z.array(z.string().uuid()),
	blockedNewWork: z.boolean(),
	incompleteReasons: z.array(z.string()).optional(),
});

export type T13Input = z.infer<typeof T13_INPUT_SCHEMA>;
export type T13Output = z.infer<typeof T13_OUTPUT_SCHEMA>;
