import type { ListMetricSeriesResponse } from "@anxionos/contracts/performance";
import { listMetricSeriesResponseSchema } from "@anxionos/contracts/performance";
import type {
	MetricSeriesRepository,
	OutcomeSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";
import { throwPerformanceError } from "../errors";
import { toMetricSeriesItem } from "./query-support";

export interface ListOutcomeSnapshotMetricsDeps {
	outcomeSnapshots: OutcomeSnapshotRepository;
	metricSeries: MetricSeriesRepository;
}

export async function listOutcomeSnapshotMetrics(
	deps: ListOutcomeSnapshotMetricsDeps,
	organizationId: string,
	outcomeSnapshotId: string,
): Promise<ListMetricSeriesResponse> {
	const snapshot = await deps.outcomeSnapshots.findByOrganizationAndId(
		organizationId,
		outcomeSnapshotId,
	);
	if (!snapshot) {
		throwPerformanceError(
			"PERF_SNAPSHOT_NOT_FOUND",
			"outcome snapshot not found",
		);
	}
	const records =
		await deps.metricSeries.listByOutcomeSnapshotId(outcomeSnapshotId);
	return listMetricSeriesResponseSchema.parse({
		metrics: records.map(toMetricSeriesItem),
	});
}
