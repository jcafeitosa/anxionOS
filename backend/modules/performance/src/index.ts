export {
	recordOutcomeSnapshot,
	type RecordOutcomeSnapshotDeps,
} from "./application/commands/record-outcome-snapshot";
export {
	recordPositionExposureSnapshot,
	type RecordPositionExposureSnapshotDeps,
} from "./application/commands/record-position-exposure-snapshot";
export { deriveLedgerPnlMetrics } from "./application/pnl-from-ledger-lines";
export { derivePositionExposureMetrics } from "./application/exposure-from-position";
export {
	OFFICIAL_LEDGER_PNL_METRICS,
	OFFICIAL_POSITION_EXPOSURE_METRICS,
} from "./domain/metric-definitions";
export {
	createLedgerPostedConsumer,
	type LedgerPostedConsumerDeps,
} from "./application/consumers/ledger-posted-consumer";
export {
	createPositionUpdatedConsumer,
	type PositionUpdatedConsumerDeps,
} from "./application/consumers/position-updated-consumer";
export {
	PerformanceCommandError,
	throwPerformanceError,
} from "./application/errors";
export { ensurePerformanceSchema } from "./infrastructure/migrate";
export { createPerformanceDb } from "./infrastructure/create-db";
export { createPerformanceUnitOfWork } from "./infrastructure/performance-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export {
	getOutcomeSnapshot,
	type GetOutcomeSnapshotDeps,
} from "./application/queries/get-outcome-snapshot";
export {
	listOutcomeSnapshots,
	type ListOutcomeSnapshotsDeps,
} from "./application/queries/list-outcome-snapshots";
export {
	getPositionExposureSnapshot,
	type GetPositionExposureSnapshotDeps,
} from "./application/queries/get-position-exposure-snapshot";
export {
	listPositionExposureSnapshots,
	type ListPositionExposureSnapshotsDeps,
} from "./application/queries/list-position-exposure-snapshots";
export {
	listOutcomeSnapshotMetrics,
	type ListOutcomeSnapshotMetricsDeps,
} from "./application/queries/list-outcome-snapshot-metrics";
export {
	listPositionExposureSnapshotMetrics,
	type ListPositionExposureSnapshotMetricsDeps,
} from "./application/queries/list-position-exposure-snapshot-metrics";
export {
	rebuildMetricTimeseries,
	type RebuildMetricTimeseriesDeps,
	type RebuildMetricTimeseriesInput,
	type RebuildMetricTimeseriesResult,
} from "./application/commands/rebuild-metric-timeseries";
export {
	listMetricPoints,
	listPnlSeriesPoints,
	type ListMetricPointsDeps,
} from "./application/queries/list-metric-timeseries";
export { createPgMetricTimeseriesRepository } from "./infrastructure/persistence/metric-timeseries-repository";
