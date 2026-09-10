import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createDrizzleAgentBudgetRepository } from "./agent-budget-repository";
import { createDrizzleAgentRoutineRepository } from "./agent-routine-repository";
import { createDrizzleAgentSkillBindingRepository } from "./agent-skill-binding-repository";
import { createDrizzleAgentRepository } from "./agent-repository";
import { createDrizzleAgentVersionRepository } from "./agent-version-repository";
import { createDrizzleCommandJournalRepository } from "./command-journal-repository";
import { createDrizzleSkillRepository } from "./skill-repository";
import { createDrizzleSkillVersionRepository } from "./skill-version-repository";
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
		skillRepository: createDrizzleSkillRepository(db),
		skillVersionRepository: createDrizzleSkillVersionRepository(db),
		agentRoutineRepository: createDrizzleAgentRoutineRepository(db),
		agentBudgetRepository: createDrizzleAgentBudgetRepository(db),
		agentSkillBindingRepository: createDrizzleAgentSkillBindingRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
	};
}
