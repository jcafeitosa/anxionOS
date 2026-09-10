import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import { createDrizzleAgentRepository } from "./persistence/agent-repository";
import { createDrizzleAgentVersionRepository } from "./persistence/agent-version-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import * as schema from "./persistence/schema";

export function createAgentsDb(pool: Pool | PoolClient) {
	const db = drizzle(pool, { schema });
	return {
		db,
		schema,
		agentRepository: createDrizzleAgentRepository(db),
		agentVersionRepository: createDrizzleAgentVersionRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
	};
}
