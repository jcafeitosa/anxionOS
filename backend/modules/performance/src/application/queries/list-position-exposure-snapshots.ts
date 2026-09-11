import type { ListPositionExposureSnapshotsResponse } from "@anxionos/contracts/performance";
import { listPositionExposureSnapshotsResponseSchema } from "@anxionos/contracts/performance";
import type {
	ListPositionExposureSnapshotsFilter,
	PositionExposureSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";
import { toPositionExposureSnapshot } from "./query-support";

export interface ListPositionExposureSnapshotsDeps {
	positionExposureSnapshots: PositionExposureSnapshotRepository;
}

export async function listPositionExposureSnapshots(
	deps: ListPositionExposureSnapshotsDeps,
	organizationId: string,
	filter?: ListPositionExposureSnapshotsFilter,
): Promise<ListPositionExposureSnapshotsResponse> {
	const records = await deps.positionExposureSnapshots.listByOrganizationId(
		organizationId,
		filter,
	);
	return listPositionExposureSnapshotsResponseSchema.parse({
		positionExposureSnapshots: records.map(toPositionExposureSnapshot),
	});
}
