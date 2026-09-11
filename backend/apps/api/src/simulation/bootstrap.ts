import { createSimulationDb } from "@anxionos/simulation";
import type { Pool } from "pg";

export interface SimulationApiRuntime {
	runs: ReturnType<typeof createSimulationDb>["runs"];
	snapshots: ReturnType<typeof createSimulationDb>["snapshots"];
}

export function createSimulationApiRuntime(pool: Pool): SimulationApiRuntime {
	const db = createSimulationDb(pool);
	return {
		runs: db.runs,
		snapshots: db.snapshots,
	};
}
