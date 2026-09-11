import {
	listOutcomeSnapshotsQuerySchema,
	listPositionExposureSnapshotsQuerySchema,
	performanceOutcomeSnapshotIdSchema,
	performancePositionExposureSnapshotIdSchema,
} from "@anxionos/contracts/performance";
import {
	getOutcomeSnapshot,
	getPositionExposureSnapshot,
	listOutcomeSnapshotMetrics,
	listOutcomeSnapshots,
	listPositionExposureSnapshotMetrics,
	listPositionExposureSnapshots,
} from "@anxionos/performance";
import { z } from "zod";
import type { PerformancePluginDeps } from "../plugin";

export const outcomeSnapshotIdParamSchema = z.object({
	outcomeSnapshotId: performanceOutcomeSnapshotIdSchema,
});

export const positionExposureSnapshotIdParamSchema = z.object({
	positionExposureSnapshotId: performancePositionExposureSnapshotIdSchema,
});

export async function handleListOutcomeSnapshots(
	deps: PerformancePluginDeps,
	input: { agencyId: string; query: Record<string, string | undefined> },
) {
	const filter = listOutcomeSnapshotsQuerySchema.parse(input.query);
	return listOutcomeSnapshots(
		{ outcomeSnapshots: deps.outcomeSnapshots },
		input.agencyId,
		filter,
	);
}

export async function handleGetOutcomeSnapshot(
	deps: PerformancePluginDeps,
	input: { agencyId: string; outcomeSnapshotId: string },
) {
	return getOutcomeSnapshot(
		{ outcomeSnapshots: deps.outcomeSnapshots },
		input.agencyId,
		input.outcomeSnapshotId,
	);
}

export async function handleListOutcomeSnapshotMetrics(
	deps: PerformancePluginDeps,
	input: { agencyId: string; outcomeSnapshotId: string },
) {
	return listOutcomeSnapshotMetrics(
		{
			outcomeSnapshots: deps.outcomeSnapshots,
			metricSeries: deps.metricSeries,
		},
		input.agencyId,
		input.outcomeSnapshotId,
	);
}

export async function handleListPositionExposureSnapshots(
	deps: PerformancePluginDeps,
	input: { agencyId: string; query: Record<string, string | undefined> },
) {
	const filter = listPositionExposureSnapshotsQuerySchema.parse(input.query);
	return listPositionExposureSnapshots(
		{ positionExposureSnapshots: deps.positionExposureSnapshots },
		input.agencyId,
		filter,
	);
}

export async function handleGetPositionExposureSnapshot(
	deps: PerformancePluginDeps,
	input: { agencyId: string; positionExposureSnapshotId: string },
) {
	return getPositionExposureSnapshot(
		{ positionExposureSnapshots: deps.positionExposureSnapshots },
		input.agencyId,
		input.positionExposureSnapshotId,
	);
}

export async function handleListPositionExposureSnapshotMetrics(
	deps: PerformancePluginDeps,
	input: { agencyId: string; positionExposureSnapshotId: string },
) {
	return listPositionExposureSnapshotMetrics(
		{
			positionExposureSnapshots: deps.positionExposureSnapshots,
			metricSeries: deps.metricSeries,
		},
		input.agencyId,
		input.positionExposureSnapshotId,
	);
}
