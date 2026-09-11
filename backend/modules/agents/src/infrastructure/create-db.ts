import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import { createDrizzleAgentRepository } from "./persistence/agent-repository";
import { createDrizzleAgentSkillBindingRepository } from "./persistence/agent-skill-binding-repository";
import { createDrizzleAgentVersionRepository } from "./persistence/agent-version-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import * as schema from "./persistence/schema";
import { createDrizzleSkillRepository } from "./persistence/skill-repository";
import { createDrizzleSkillVersionRepository } from "./persistence/skill-version-repository";

export function createAgentsDb(pool: Pool | PoolClient) {
	const db = drizzle(pool, { schema });
	return {
		db,
		schema,
		agentRepository: createDrizzleAgentRepository(db),
		agentVersionRepository: createDrizzleAgentVersionRepository(db),
		skillRepository: createDrizzleSkillRepository(db),
		skillVersionRepository: createDrizzleSkillVersionRepository(db),
		agentSkillBindingRepository: createDrizzleAgentSkillBindingRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
	};
}
