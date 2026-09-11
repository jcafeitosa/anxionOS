import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CertificationRepository } from "./certification";
import type { CommandJournalRepository } from "./command-journal";
export interface EvaluationRecordRow {
	id: string;
	organizationId: string;
	outcomeSnapshotId: string;
	valueDate: string;
	computedAt: string;
}
export interface EvaluationScoreRow {
	id: string;
	organizationId: string;
	evaluationRecordId: string;
	scoreMetric: string;
	scoreValue: string;
	computedAt: string;
}
export interface EvaluationRecordRepository {
	findById(id: string): Promise<EvaluationRecordRow | null>;
	findByOutcomeSnapshotId(
		outcomeSnapshotId: string,
	): Promise<EvaluationRecordRow | null>;
	save(record: EvaluationRecordRow): Promise<EvaluationRecordRow>;
}
export interface EvaluationScoreRepository {
	findByEvaluationRecordId(
		evaluationRecordId: string,
	): Promise<EvaluationScoreRow | null>;
	save(record: EvaluationScoreRow): Promise<EvaluationScoreRow>;
}
export interface EvaluationTransactionContext {
	commandJournal: CommandJournalRepository;
	evaluationRecords: EvaluationRecordRepository;
	evaluationScores: EvaluationScoreRepository;
	certifications: CertificationRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface EvaluationUnitOfWork {
	runInTransaction<T>(
		work: (ctx: EvaluationTransactionContext) => Promise<T>,
	): Promise<T>;
}
