export {
	recordEvaluationScore,
	type RecordEvaluationScoreDeps,
} from "./application/commands/record-evaluation-score";
export {
	issueCertification,
	type IssueCertificationDeps,
} from "./application/commands/issue-certification";
export {
	createOutcomeRecordedConsumer,
	type OutcomeRecordedConsumerDeps,
} from "./application/consumers/outcome-recorded-consumer";
export {
	EvaluationCommandError,
	throwEvaluationError,
} from "./application/errors";
export { ensureEvaluationSchema } from "./infrastructure/migrate";
export { createEvaluationUnitOfWork } from "./infrastructure/evaluation-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export { createPgCertificationRepository } from "./infrastructure/persistence/certification-repository";
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
export {
	getCertificationBySubject,
	type GetCertificationBySubjectDeps,
} from "./application/queries/get-certification-by-subject";
export {
	getEvaluationRecord,
	type GetEvaluationRecordDeps,
} from "./application/queries/get-evaluation-record";
export {
	getEvaluationScore,
	type GetEvaluationScoreDeps,
} from "./application/queries/get-evaluation-score";
export type {
	EvaluationCertificationView,
	EvaluationRecordView,
	EvaluationScoreView,
} from "./application/queries/query-support";
