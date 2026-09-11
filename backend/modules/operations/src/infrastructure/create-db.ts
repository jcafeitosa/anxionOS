import type { Pool, PoolClient } from "pg";
import {
	createPgIncidentRepository,
	createPgRecoveryTaskRepository,
} from "./persistence/repositories";

export function createOperationsDb(pool: Pool | PoolClient) {
	return {
		incidents: createPgIncidentRepository(pool),
		recoveryTasks: createPgRecoveryTaskRepository(pool),
	};
}
