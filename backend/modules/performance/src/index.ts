export {
	type RebuildMetricTimeseriesDeps,
	type RebuildMetricTimeseriesInput,
	type RebuildMetricTimeseriesResult,
	rebuildMetricTimeseries,
} from "./application/commands/rebuild-metric-timeseries";
export {
	type RecordOutcomeSnapshotDeps,
	recordOutcomeSnapshot,
} from "./application/commands/record-outcome-snapshot";
export {
	type RecordPositionExposureSnapshotDeps,
	recordPositionExposureSnapshot,
} from "./application/commands/record-position-exposure-snapshot";
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
export { derivePositionExposureMetrics } from "./application/exposure-from-position";
export { deriveLedgerPnlMetrics } from "./application/pnl-from-ledger-lines";
export {
	type GetOutcomeSnapshotDeps,
	getOutcomeSnapshot,
} from "./application/queries/get-outcome-snapshot";
export {
	type GetPositionExposureSnapshotDeps,
	getPositionExposureSnapshot,
} from "./application/queries/get-position-exposure-snapshot";
export {
	type ListMetricPointsDeps,
	listMetricPoints,
	listPnlSeriesPoints,
} from "./application/queries/list-metric-timeseries";
export {
	type ListOutcomeSnapshotMetricsDeps,
	listOutcomeSnapshotMetrics,
} from "./application/queries/list-outcome-snapshot-metrics";
export {
	type ListOutcomeSnapshotsDeps,
	listOutcomeSnapshots,
} from "./application/queries/list-outcome-snapshots";
export {
	type ListPositionExposureSnapshotMetricsDeps,
	listPositionExposureSnapshotMetrics,
} from "./application/queries/list-position-exposure-snapshot-metrics";
export {
	type ListPositionExposureSnapshotsDeps,
	listPositionExposureSnapshots,
} from "./application/queries/list-position-exposure-snapshots";
export {
	OFFICIAL_LEDGER_PNL_METRICS,
	OFFICIAL_POSITION_EXPOSURE_METRICS,
} from "./domain/metric-definitions";
export { createPerformanceDb } from "./infrastructure/create-db";
export { ensurePerformanceSchema } from "./infrastructure/migrate";
export { createPerformanceUnitOfWork } from "./infrastructure/performance-unit-of-work";
export { createPgCommandJournalRepository } from "./infrastructure/persistence/command-journal-repository";
export { createPgMetricTimeseriesRepository } from "./infrastructure/persistence/metric-timeseries-repository";
