import type { CertificationRepository } from "../../domain/ports/certification";
import { throwEvaluationError } from "../errors";
import {
	type EvaluationCertificationView,
	toCertificationView,
} from "./query-support";

export interface GetCertificationBySubjectDeps {
	certifications: CertificationRepository;
}

export async function getCertificationBySubject(
	deps: GetCertificationBySubjectDeps,
	input: {
		organizationId: string;
		strategyId: string;
		strategyVersionId: string;
		policyHash?: string;
	},
): Promise<EvaluationCertificationView> {
	const row = await deps.certifications.findBySubject({
		organizationId: input.organizationId,
		subjectType: "strategy_version",
		strategyId: input.strategyId,
		strategyVersionId: input.strategyVersionId,
		policyHash: input.policyHash,
	});
	if (!row) {
		throwEvaluationError(
			"EVL_CERTIFICATION_NOT_FOUND",
			"issued certification not found for subject",
		);
	}
	if (row.organizationId !== input.organizationId) {
		throwEvaluationError(
			"EVL_CROSS_TENANT",
			"certification organization mismatch",
		);
	}
	return toCertificationView(row);
}
