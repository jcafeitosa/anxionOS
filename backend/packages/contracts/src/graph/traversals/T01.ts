import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";
import { nodeKeySchema } from "../types";
import { traversalMetaSchema } from "./common";
export const TRAVERSAL_T01_META = traversalMetaSchema.parse({
	traversalId: "T01",
	queryVersion: 1,
	name: "authorization.can",
	class: "kernel",
	cacheable: "conditional",
});
export const T01_INPUT_SCHEMA = z.object({
	actorId: institutionalUuidSchema,
	action: z.string().min(1),
	resourceNodeKey: nodeKeySchema,
	intentHash: z.string().min(1).optional(),
	validAt: z.string().datetime(),
	expectedAuthorityEpoch: z.number().int().nonnegative().optional(),
	expectedRiskEpoch: z.number().int().nonnegative().optional(),
});
export const T01_OUTPUT_SCHEMA = z.object({
	decision: z.enum(["ALLOW", "DENY", "REQUIRE_APPROVAL"]),
	authorityEpoch: z.number().int().nonnegative().optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
	proof: z
		.object({
			grantIds: z.array(institutionalUuidSchema),
			mandateId: institutionalUuidSchema.optional(),
			policyId: institutionalUuidSchema.optional(),
			approvalId: institutionalUuidSchema.optional(),
		})
		.optional(),
	denyReasons: z.array(z.string()).optional(),
});

export type T01Input = z.infer<typeof T01_INPUT_SCHEMA>;
export type T01Output = z.infer<typeof T01_OUTPUT_SCHEMA>;
