import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createDrizzleAgentRepository } from "./agent-repository";
import { createDrizzleAgentVersionRepository } from "./agent-version-repository";
import { createDrizzleCommandJournalRepository } from "./command-journal-repository";
import * as schema from "./schema";

function createAgentsDb(pool: Pool) {
	return drizzle(pool, { schema });
}

export function createAgentsCommandJournalFromPool(pool: Pool) {
	return createDrizzleCommandJournalRepository(createAgentsDb(pool));
}

export function createAgentsRepositoriesFromPool(pool: Pool) {
	const db = createAgentsDb(pool);
	return {
		agentRepository: createDrizzleAgentRepository(db),
		agentVersionRepository: createDrizzleAgentVersionRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
	};
}
