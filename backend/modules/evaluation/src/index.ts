export {
	type IssueCertificationDeps,
	issueCertification,
} from "./application/commands/issue-certification";
export {
	type RecordEvaluationScoreDeps,
	recordEvaluationScore,
} from "./application/commands/record-evaluation-score";
export {
	createOutcomeRecordedConsumer,
	type OutcomeRecordedConsumerDeps,
} from "./application/consumers/outcome-recorded-consumer";
export {
	EvaluationCommandError,
	throwEvaluationError,
} from "./application/errors";
export {
	type GetCertificationBySubjectDeps,
	getCertificationBySubject,
} from "./application/queries/get-certification-by-subject";
export {
	type GetEvaluationRecordDeps,
	getEvaluationRecord,
} from "./application/queries/get-evaluation-record";
export {
	type GetEvaluationScoreDeps,
	getEvaluationScore,
} from "./application/queries/get-evaluation-score";
export type {
	EvaluationCertificationView,
	EvaluationRecordView,
	EvaluationScoreView,
} from "./application/queries/query-support";
export type {
	CertificationRepository,
	CertificationRow,
	EvaluationCertificationStatus,
	EvaluationSubjectKind,
} from "./domain/ports/certification";
export type {
	CertificationSubjectQueryPort,
	StrategyVersionCertificationSubject,
} from "./domain/ports/certification-subject";
export type { ScoringPolicyQueryPort } from "./domain/ports/scoring-policy";

export { createEvaluationDb } from "./infrastructure/create-db";
export { createEvaluationUnitOfWork } from "./infrastructure/evaluation-unit-of-work";
export { ensureEvaluationSchema } from "./infrastructure/migrate";
export { createPgCertificationRepository } from "./infrastructure/persistence/certification-repository";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
