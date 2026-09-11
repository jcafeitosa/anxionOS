import {
	createPgCommandJournalRepository,
	createSandboxBacktestRunnerAdapter,
	createStrategiesUnitOfWork,
} from "@anxionos/strategies";
import type { Pool } from "pg";

export interface StrategiesApiRuntime {
	unitOfWork: ReturnType<typeof createStrategiesUnitOfWork>;
	commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	backtestRunner: ReturnType<typeof createSandboxBacktestRunnerAdapter>;
}

export function createStrategiesApiRuntime(pool: Pool): StrategiesApiRuntime {
	return {
		unitOfWork: createStrategiesUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		backtestRunner: createSandboxBacktestRunnerAdapter(),
	};
}
