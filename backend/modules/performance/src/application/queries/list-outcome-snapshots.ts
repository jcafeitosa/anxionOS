import type { ListOutcomeSnapshotsResponse } from "@anxionos/contracts/performance";
import { listOutcomeSnapshotsResponseSchema } from "@anxionos/contracts/performance";
import type {
	ListOutcomeSnapshotsFilter,
	OutcomeSnapshotRepository,
} from "../../domain/ports/performance-unit-of-work";
import { toOutcomeSnapshot } from "./query-support";

export interface ListOutcomeSnapshotsDeps {
	outcomeSnapshots: OutcomeSnapshotRepository;
}

export async function listOutcomeSnapshots(
	deps: ListOutcomeSnapshotsDeps,
	organizationId: string,
	filter?: ListOutcomeSnapshotsFilter,
): Promise<ListOutcomeSnapshotsResponse> {
	const records = await deps.outcomeSnapshots.listByOrganizationId(
		organizationId,
		filter,
	);
	return listOutcomeSnapshotsResponseSchema.parse({
		outcomeSnapshots: records.map(toOutcomeSnapshot),
	});
}
