import {
	createOperationsDb,
	createOperationsUnitOfWork,
	createPgCommandJournalRepository,
} from "@anxionos/operations";
import type { Pool } from "pg";

export interface OperationsApiRuntime {
	unitOfWork: ReturnType<typeof createOperationsUnitOfWork>;
	commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	incidents: ReturnType<typeof createOperationsDb>["incidents"];
	recoveryTasks: ReturnType<typeof createOperationsDb>["recoveryTasks"];
}

export function createOperationsApiRuntime(pool: Pool): OperationsApiRuntime {
	const readDb = createOperationsDb(pool);
	return {
		unitOfWork: createOperationsUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		incidents: readDb.incidents,
		recoveryTasks: readDb.recoveryTasks,
	};
}
