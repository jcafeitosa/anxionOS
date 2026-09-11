import type {
	MetricPointFilter,
	MetricTimeseriesRepository,
	PnlSeriesFilter,
} from "../../domain/ports/metric-timeseries";

export interface ListMetricPointsDeps {
	metricTimeseries: MetricTimeseriesRepository;
}

export async function listMetricPoints(
	deps: ListMetricPointsDeps,
	organizationId: string,
	filter?: MetricPointFilter,
) {
	const points = await deps.metricTimeseries.listMetricPoints(organizationId, filter);
	return { metricPoints: points };
}

export async function listPnlSeriesPoints(
	deps: ListMetricPointsDeps,
	organizationId: string,
	filter?: PnlSeriesFilter,
) {
	const points = await deps.metricTimeseries.listPnlSeriesPoints(organizationId, filter);
	return { pnlSeriesPoints: points };
}
