import {
	type EvaluationCertificationView,
	getCertificationBySubject,
} from "@anxionos/evaluation";
import { z } from "zod";
import type { EvaluationPluginDeps } from "../plugin";
import {
	getCertificationQuerySchema,
	strategyIdParamSchema,
	strategyVersionIdParamSchema,
} from "./commands";

export const getCertificationBySubjectQuerySchema = getCertificationQuerySchema;

export async function handleGetCertificationBySubject(
	deps: EvaluationPluginDeps,
	input: {
		agencyId: string;
		query: Record<string, string | undefined>;
	},
): Promise<EvaluationCertificationView> {
	const filter = getCertificationBySubjectQuerySchema.parse(input.query);
	return getCertificationBySubject(
		{ certifications: deps.certifications },
		{
			organizationId: input.agencyId,
			strategyId: filter.strategyId,
			strategyVersionId: filter.strategyVersionId,
			policyHash: filter.policyHash,
		},
	);
}

export const evaluationRecordIdParamSchema = z.object({
	evaluationRecordId: z.string().regex(/^evl_rec_[0-9a-f-]{36}$/i),
});
