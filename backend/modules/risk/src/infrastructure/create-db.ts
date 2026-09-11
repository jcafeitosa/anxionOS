import type { Pool, PoolClient } from "pg";
import { createPgKillSwitchRepository } from "./persistence/repositories";

export function createRiskDb(pool: Pool | PoolClient) {
	return {
		killSwitch: createPgKillSwitchRepository(pool),
	};
}
