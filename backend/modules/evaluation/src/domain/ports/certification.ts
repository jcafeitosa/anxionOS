export type EvaluationSubjectKind = "strategy_version";
export type EvaluationCertificationStatus = "issued" | "revoked";

export interface CertificationRow {
	id: string;
	organizationId: string;
	subjectType: EvaluationSubjectKind;
	strategyId: string;
	strategyVersionId: string;
	evaluationRecordId?: string;
	policyHash?: string;
	status: EvaluationCertificationStatus;
	issuedAt: string;
	revokedAt?: string;
}

export interface CertificationRepository {
	findById(id: string): Promise<CertificationRow | null>;
	findBySubject(input: {
		organizationId: string;
		subjectType: EvaluationSubjectKind;
		strategyId: string;
		strategyVersionId: string;
		policyHash?: string;
	}): Promise<CertificationRow | null>;
	save(row: CertificationRow): Promise<CertificationRow>;
}
