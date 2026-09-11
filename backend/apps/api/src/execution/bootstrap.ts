import { createExecutionDb } from "@anxionos/execution";
import type { Pool } from "pg";

export interface ExecutionApiRuntime {
	orders: ReturnType<typeof createExecutionDb>["orders"];
	reconciliationCases: ReturnType<
		typeof createExecutionDb
	>["reconciliationCases"];
}

export function createExecutionApiRuntime(pool: Pool): ExecutionApiRuntime {
	const db = createExecutionDb(pool);
	return {
		orders: db.orders,
		reconciliationCases: db.reconciliationCases,
	};
}
