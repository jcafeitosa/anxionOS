import { createPerformanceDb } from "@anxionos/performance";
import type { Pool } from "pg";

export interface PerformanceApiRuntime {
	outcomeSnapshots: ReturnType<typeof createPerformanceDb>["outcomeSnapshots"];
	positionExposureSnapshots: ReturnType<
		typeof createPerformanceDb
	>["positionExposureSnapshots"];
	metricSeries: ReturnType<typeof createPerformanceDb>["metricSeries"];
}

export function createPerformanceApiRuntime(pool: Pool): PerformanceApiRuntime {
	const db = createPerformanceDb(pool);
	return {
		outcomeSnapshots: db.outcomeSnapshots,
		positionExposureSnapshots: db.positionExposureSnapshots,
		metricSeries: db.metricSeries,
	};
}
