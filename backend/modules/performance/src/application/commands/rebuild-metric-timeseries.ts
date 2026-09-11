import type { MetricTimeseriesRepository } from "../../domain/ports/metric-timeseries";

export interface RebuildMetricTimeseriesDeps {
	metricTimeseries: MetricTimeseriesRepository;
}

export interface RebuildMetricTimeseriesInput {
	organizationId?: string;
}

export interface RebuildMetricTimeseriesResult {
	metricPointsInserted: number;
	pnlPointsInserted: number;
	idempotentReplay: boolean;
}

export async function rebuildMetricTimeseries(
	deps: RebuildMetricTimeseriesDeps,
	input: RebuildMetricTimeseriesInput = {},
): Promise<RebuildMetricTimeseriesResult> {
	const counts = await deps.metricTimeseries.rebuildFromMetricSeries(
		input.organizationId,
	);
	return {
		...counts,
		idempotentReplay:
			counts.metricPointsInserted === 0 && counts.pnlPointsInserted === 0,
	};
}
