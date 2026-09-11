import {
	createPgCommandJournalRepository,
	createRiskDb,
	createRiskUnitOfWork,
} from "@anxionos/risk";
import type { Pool } from "pg";

export interface RiskApiRuntime {
	unitOfWork: ReturnType<typeof createRiskUnitOfWork>;
	commandJournal: ReturnType<typeof createPgCommandJournalRepository>;
	killSwitch: ReturnType<typeof createRiskDb>["killSwitch"];
}

export function createRiskApiRuntime(pool: Pool): RiskApiRuntime {
	const db = createRiskDb(pool);
	return {
		unitOfWork: createRiskUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		killSwitch: db.killSwitch,
	};
}
