import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
import type { MetricTimeseriesRepository } from "./metric-timeseries";
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
export interface PositionExposureSnapshotRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	positionId: string;
	revision: number;
	instrumentId: string;
	positionSide: string;
	book: string;
	quantity: string;
	fillId: string;
	side: string;
	provisionalCash: boolean;
	observedAt: string;
}
export interface MetricSeriesRecord {
	id: string;
	organizationId: string;
	outcomeSnapshotId?: string;
	positionExposureSnapshotId?: string;
	metricName: string;
	metricValue: string;
	observedAt: string;
}
export interface ListOutcomeSnapshotsFilter {
	journalEntryId?: string;
	limit?: number;
}

export interface ListPositionExposureSnapshotsFilter {
	portfolioId?: string;
	positionId?: string;
	limit?: number;
}

export interface OutcomeSnapshotRepository {
	findById(id: string): Promise<OutcomeSnapshotRecord | null>;
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<OutcomeSnapshotRecord | null>;
	findByJournalEntryId(
		journalEntryId: string,
	): Promise<OutcomeSnapshotRecord | null>;
	listByOrganizationId(
		organizationId: string,
		filter?: ListOutcomeSnapshotsFilter,
	): Promise<OutcomeSnapshotRecord[]>;
	save(record: OutcomeSnapshotRecord): Promise<OutcomeSnapshotRecord>;
}
export interface PositionExposureSnapshotRepository {
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<PositionExposureSnapshotRecord | null>;
	findByPositionRevision(
		positionId: string,
		revision: number,
	): Promise<PositionExposureSnapshotRecord | null>;
	findLatestRevision(
		positionId: string,
	): Promise<PositionExposureSnapshotRecord | null>;
	listByOrganizationId(
		organizationId: string,
		filter?: ListPositionExposureSnapshotsFilter,
	): Promise<PositionExposureSnapshotRecord[]>;
	save(
		record: PositionExposureSnapshotRecord,
	): Promise<PositionExposureSnapshotRecord>;
}
export interface MetricSeriesRepository {
	findByOutcomeAndMetric(
		outcomeSnapshotId: string,
		metricName: string,
	): Promise<MetricSeriesRecord | null>;
	findByPositionExposureAndMetric(
		positionExposureSnapshotId: string,
		metricName: string,
	): Promise<MetricSeriesRecord | null>;
	listByOutcomeSnapshotId(
		outcomeSnapshotId: string,
	): Promise<MetricSeriesRecord[]>;
	listByPositionExposureSnapshotId(
		positionExposureSnapshotId: string,
	): Promise<MetricSeriesRecord[]>;
	save(record: MetricSeriesRecord): Promise<MetricSeriesRecord>;
}
export interface PerformanceTransactionContext {
	commandJournal: CommandJournalRepository;
	outcomeSnapshots: OutcomeSnapshotRepository;
	positionExposureSnapshots: PositionExposureSnapshotRepository;
	metricSeries: MetricSeriesRepository;
	metricTimeseries: MetricTimeseriesRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface PerformanceUnitOfWork {
	runInTransaction<T>(
		work: (ctx: PerformanceTransactionContext) => Promise<T>,
	): Promise<T>;
}
