import type { MetricSeriesRecord } from "./performance-unit-of-work";

export interface MetricPointFilter {
	metricName?: string;
	observedAtFrom?: string;
	observedAtTo?: string;
	limit?: number;
}

export interface PnlSeriesFilter {
	journalEntryId?: string;
	metricName?: string;
	observedAtFrom?: string;
	observedAtTo?: string;
	limit?: number;
}

export interface MetricPointRecord {
	observedAt: string;
	organizationId: string;
	metricSeriesId: string;
	metricName: string;
	metricValue: string;
	outcomeSnapshotId?: string;
	positionExposureSnapshotId?: string;
	portfolioId?: string;
	positionId?: string;
}

export interface PnlSeriesPointRecord {
	observedAt: string;
	organizationId: string;
	metricSeriesId: string;
	outcomeSnapshotId: string;
	journalEntryId: string;
	metricName: string;
	metricValue: string;
}

export interface MetricTimeseriesRepository {
	mirrorMetricSeries(
		record: MetricSeriesRecord,
		context?: {
			journalEntryId?: string;
			portfolioId?: string;
			positionId?: string;
		},
	): Promise<void>;
	listMetricPoints(
		organizationId: string,
		filter?: MetricPointFilter,
	): Promise<MetricPointRecord[]>;
	listPnlSeriesPoints(
		organizationId: string,
		filter?: PnlSeriesFilter,
	): Promise<PnlSeriesPointRecord[]>;
	rebuildFromMetricSeries(organizationId?: string): Promise<{
		metricPointsInserted: number;
		pnlPointsInserted: number;
	}>;
}
