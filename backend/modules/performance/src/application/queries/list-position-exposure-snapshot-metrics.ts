import type { ListMetricSeriesResponse } from "@anxionos/contracts/performance";
import { listMetricSeriesResponseSchema } from "@anxionos/contracts/performance";
import type {
	MetricSeriesRepository,
	PositionExposureSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";
import { throwPerformanceError } from "../errors";
import { toMetricSeriesItem } from "./query-support";

export interface ListPositionExposureSnapshotMetricsDeps {
	positionExposureSnapshots: PositionExposureSnapshotRepository;
	metricSeries: MetricSeriesRepository;
}

export async function listPositionExposureSnapshotMetrics(
	deps: ListPositionExposureSnapshotMetricsDeps,
	organizationId: string,
	positionExposureSnapshotId: string,
): Promise<ListMetricSeriesResponse> {
	const snapshot = await deps.positionExposureSnapshots.findByOrganizationAndId(
		organizationId,
		positionExposureSnapshotId,
	);
	if (!snapshot) {
		throwPerformanceError(
			"PERF_SNAPSHOT_NOT_FOUND",
			"position exposure snapshot not found",
		);
	}
	const records = await deps.metricSeries.listByPositionExposureSnapshotId(
		positionExposureSnapshotId,
	);
	return listMetricSeriesResponseSchema.parse({
		metrics: records.map(toMetricSeriesItem),
	});
}
