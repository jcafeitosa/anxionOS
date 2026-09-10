import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface OutcomeSnapshotRecord {
	id: string;
	organizationId: string;
	journalEntryId: string;
	valueDate: string;
	linesSummary: Array<{
		accountCode: string;
		debit: string;
		credit: string;
		asset: string;
		amount: string;
	}>;
	recordedAt: string;
}
export interface MetricSeriesRecord {
	id: string;
	organizationId: string;
	outcomeSnapshotId: string;
	metricName: string;
	metricValue: string;
	observedAt: string;
}
export interface OutcomeSnapshotRepository {
	findById(id: string): Promise<OutcomeSnapshotRecord | null>;
	findByJournalEntryId(
		journalEntryId: string,
	): Promise<OutcomeSnapshotRecord | null>;
	save(record: OutcomeSnapshotRecord): Promise<OutcomeSnapshotRecord>;
}
export interface MetricSeriesRepository {
	save(record: MetricSeriesRecord): Promise<MetricSeriesRecord>;
}
export interface PerformanceTransactionContext {
	commandJournal: CommandJournalRepository;
	outcomeSnapshots: OutcomeSnapshotRepository;
	metricSeries: MetricSeriesRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface PerformanceUnitOfWork {
	runInTransaction<T>(
		work: (ctx: PerformanceTransactionContext) => Promise<T>,
	): Promise<T>;
}
