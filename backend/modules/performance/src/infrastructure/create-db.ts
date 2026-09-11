import type { Pool, PoolClient } from "pg";
import {
	createPgMetricSeriesRepository,
	createPgOutcomeSnapshotRepository,
	createPgPositionExposureSnapshotRepository,
} from "./persistence/repositories";

export function createPerformanceDb(pool: Pool | PoolClient) {
	return {
		outcomeSnapshots: createPgOutcomeSnapshotRepository(pool),
		positionExposureSnapshots: createPgPositionExposureSnapshotRepository(pool),
		metricSeries: createPgMetricSeriesRepository(pool),
	};
}
