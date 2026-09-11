import type { OutcomeSnapshot } from "@anxionos/contracts/performance";
import type { OutcomeSnapshotRepository } from "../../domain/ports/performance-unit-of-work";
import { throwPerformanceError } from "../errors";
import { toOutcomeSnapshot } from "./query-support";

export interface GetOutcomeSnapshotDeps {
	outcomeSnapshots: OutcomeSnapshotRepository;
}

export async function getOutcomeSnapshot(
	deps: GetOutcomeSnapshotDeps,
	organizationId: string,
	outcomeSnapshotId: string,
): Promise<OutcomeSnapshot> {
	const record = await deps.outcomeSnapshots.findByOrganizationAndId(
		organizationId,
		outcomeSnapshotId,
	);
	if (!record) {
		throwPerformanceError(
			"PERF_SNAPSHOT_NOT_FOUND",
			"outcome snapshot not found",
		);
	}
	return toOutcomeSnapshot(record);
}
