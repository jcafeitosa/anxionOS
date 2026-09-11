import { issueCertificationCommandSchema } from "@anxionos/contracts/evaluation";
import { issueCertification } from "@anxionos/evaluation";
import {
	strategyIdParamSchema,
	strategyVersionIdParamSchema,
} from "../../strategies/handlers/commands";
import type { EvaluationPluginDeps } from "../plugin";

export const getCertificationQuerySchema = issueCertificationCommandSchema
	.pick({
		strategyId: true,
		strategyVersionId: true,
		policyHash: true,
	})
	.strict();

const issueCertificationBodySchema = issueCertificationCommandSchema
	.omit({ commandId: true, organizationId: true })
	.strict();

export async function handleIssueCertification(
	deps: EvaluationPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		body: unknown;
	},
) {
	const body = issueCertificationBodySchema.parse(input.body);
	return issueCertification(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			subjectQuery: deps.subjectQuery,
			scoringPolicyQuery: deps.scoringPolicyQuery,
		},
		{
			commandId: input.commandId,
			organizationId: input.agencyId,
			strategyId: body.strategyId,
			strategyVersionId: body.strategyVersionId,
			evaluationRecordId: body.evaluationRecordId,
			policyHash: body.policyHash,
		},
	);
}

export { strategyIdParamSchema, strategyVersionIdParamSchema };
