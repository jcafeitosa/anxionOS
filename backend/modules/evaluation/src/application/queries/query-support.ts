import type { CertificationRow } from "../../domain/ports/certification";
import type {
	EvaluationRecordRow,
	EvaluationScoreRow,
} from "../../domain/ports/evaluation-unit-of-work";

export interface EvaluationCertificationView {
	certificationId: string;
	organizationId: string;
	subjectType: CertificationRow["subjectType"];
	strategyId: string;
	strategyVersionId: string;
	evaluationRecordId?: string;
	policyHash?: string;
	status: CertificationRow["status"];
	issuedAt: string;
	revokedAt?: string;
}

export interface EvaluationRecordView {
	evaluationRecordId: string;
	organizationId: string;
	outcomeSnapshotId: string;
	valueDate: string;
	computedAt: string;
}

export interface EvaluationScoreView {
	evaluationScoreId: string;
	organizationId: string;
	evaluationRecordId: string;
	scoreMetric: string;
	scoreValue: string;
	computedAt: string;
}

export function toCertificationView(
	row: CertificationRow,
): EvaluationCertificationView {
	return {
		certificationId: row.id,
		organizationId: row.organizationId,
		subjectType: row.subjectType,
		strategyId: row.strategyId,
		strategyVersionId: row.strategyVersionId,
		evaluationRecordId: row.evaluationRecordId,
		policyHash: row.policyHash,
		status: row.status,
		issuedAt: row.issuedAt,
		revokedAt: row.revokedAt,
	};
}

export function toEvaluationRecordView(
	row: EvaluationRecordRow,
): EvaluationRecordView {
	return {
		evaluationRecordId: row.id,
		organizationId: row.organizationId,
		outcomeSnapshotId: row.outcomeSnapshotId,
		valueDate: row.valueDate,
		computedAt: row.computedAt,
	};
}

export function toEvaluationScoreView(row: EvaluationScoreRow): EvaluationScoreView {
	return {
		evaluationScoreId: row.id,
		organizationId: row.organizationId,
		evaluationRecordId: row.evaluationRecordId,
		scoreMetric: row.scoreMetric,
		scoreValue: row.scoreValue,
		computedAt: row.computedAt,
	};
}
