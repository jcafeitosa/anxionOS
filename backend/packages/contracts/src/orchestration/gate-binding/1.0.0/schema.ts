import { z } from "zod";
import {
	agentIdSchema,
	artifactDigestSchema,
	gateDispositionSchema,
	gateIdSchema,
	hierarchyModeSchema,
	issueIdentifierSchema,
	runIdSchema,
} from "../../types";
export const gateBindingSchemaVersion = "1.0.0";
export const gateBindingV1ObjectSchema = z.object({
	schemaVersion: z.literal(gateBindingSchemaVersion),
	gateId: gateIdSchema,
	issueIdentifier: issueIdentifierSchema,
	disposition: gateDispositionSchema,
	reviewerId: agentIdSchema,
	recordedAt: z.string().datetime(),
	runId: runIdSchema.optional(),
	artifactRevision: z.number().int().min(1).optional(),
	hierarchyModeAtRecord: hierarchyModeSchema.optional(),
	invalidatedAt: z.string().datetime().optional(),
	artifactDigest: artifactDigestSchema.optional(),
	notApplicableReason: z.string().max(500).optional(),
});
export function refineGateBindingDigestRules(
	val: Pick<
		GateBindingV1Object,
		"disposition" | "artifactDigest" | "notApplicableReason"
	>,
	ctx: z.RefinementCtx,
): void {
	if (val.disposition === "NOT_APPLICABLE") {
		if (!val.notApplicableReason) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "notApplicableReason required for NOT_APPLICABLE",
				path: ["notApplicableReason"],
			});
		}
		return;
	}
	if (!val.artifactDigest) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: "artifactDigest required unless NOT_APPLICABLE",
			path: ["artifactDigest"],
		});
	}
}
export const gateBindingV1Schema = gateBindingV1ObjectSchema.superRefine(
	refineGateBindingDigestRules,
);

export type GateBindingV1Object = z.infer<typeof gateBindingV1ObjectSchema>;

export type GateBindingV1 = z.infer<typeof gateBindingV1Schema>;
