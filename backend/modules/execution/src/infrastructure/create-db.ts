import type { Pool, PoolClient } from "pg";
import {
	createPgExecutionOrderRepository,
	createPgExecutionReconciliationCaseRepository,
} from "./persistence/repositories";

export function createExecutionDb(pool: Pool | PoolClient) {
	return {
		orders: createPgExecutionOrderRepository(pool),
		reconciliationCases: createPgExecutionReconciliationCaseRepository(pool),
	};
}
