import type { PositionExposureSnapshot } from "@anxionos/contracts/performance";
import type { PositionExposureSnapshotRepository } from "../../domain/ports/performance-unit-of-work";
import { throwPerformanceError } from "../errors";
import { toPositionExposureSnapshot } from "./query-support";

export interface GetPositionExposureSnapshotDeps {
	positionExposureSnapshots: PositionExposureSnapshotRepository;
}

export async function getPositionExposureSnapshot(
	deps: GetPositionExposureSnapshotDeps,
	organizationId: string,
	positionExposureSnapshotId: string,
): Promise<PositionExposureSnapshot> {
	const record = await deps.positionExposureSnapshots.findByOrganizationAndId(
		organizationId,
		positionExposureSnapshotId,
	);
	if (!record) {
		throwPerformanceError(
			"PERF_SNAPSHOT_NOT_FOUND",
			"position exposure snapshot not found",
		);
	}
	return toPositionExposureSnapshot(record);
}
