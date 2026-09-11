import type { Pool, PoolClient } from "pg";
import { createSimulationDb as createPgSimulationRepositories } from "./persistence/repositories";

export function createSimulationDb(pool: Pool | PoolClient) {
	return createPgSimulationRepositories(pool);
}
