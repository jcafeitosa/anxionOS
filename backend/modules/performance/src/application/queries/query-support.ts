import type {
	MetricSeriesItem,
	OutcomeSnapshot,
	PositionExposureSnapshot,
} from "@anxionos/contracts/performance";
import {
	metricSeriesItemSchema,
	outcomeSnapshotSchema,
	positionExposureSnapshotSchema,
} from "@anxionos/contracts/performance";
import type {
	MetricSeriesRecord,
	OutcomeSnapshotRecord,
	PositionExposureSnapshotRecord,
} from "../../domain/ports/performance-unit-of-work";

export function toOutcomeSnapshot(
	record: OutcomeSnapshotRecord,
): OutcomeSnapshot {
	return outcomeSnapshotSchema.parse({
		outcomeSnapshotId: record.id,
		organizationId: record.organizationId,
		journalEntryId: record.journalEntryId,
		valueDate: record.valueDate,
		linesSummary: record.linesSummary,
		recordedAt: record.recordedAt,
	});
}

export function toPositionExposureSnapshot(
	record: PositionExposureSnapshotRecord,
): PositionExposureSnapshot {
	return positionExposureSnapshotSchema.parse({
		positionExposureSnapshotId: record.id,
		organizationId: record.organizationId,
		portfolioId: record.portfolioId,
		positionId: record.positionId,
		revision: record.revision,
		instrumentId: record.instrumentId,
		positionSide: record.positionSide,
		book: record.book,
		quantity: record.quantity,
		fillId: record.fillId,
		side: record.side,
		provisionalCash: record.provisionalCash,
		observedAt: record.observedAt,
	});
}

export function toMetricSeriesItem(record: MetricSeriesRecord): MetricSeriesItem {
	return metricSeriesItemSchema.parse({
		metricSeriesId: record.id,
		organizationId: record.organizationId,
		outcomeSnapshotId: record.outcomeSnapshotId,
		positionExposureSnapshotId: record.positionExposureSnapshotId,
		metricName: record.metricName,
		metricValue: record.metricValue,
		observedAt: record.observedAt,
	});
}
