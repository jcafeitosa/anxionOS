import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { applyTenantContext } from "@anxionos/database";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient } from "pg";
import type {
	AgentsTransactionContext,
	AgentsUnitOfWork,
} from "../domain/ports/agents-unit-of-work";
import type { TenantContext } from "../domain/ports/tenant-context";
import { createDrizzleAgentBudgetRepository } from "./persistence/agent-budget-repository";
import { createDrizzleAgentRepository } from "./persistence/agent-repository";
import { createDrizzleAgentRoutineRepository } from "./persistence/agent-routine-repository";
import { createDrizzleAgentSkillBindingRepository } from "./persistence/agent-skill-binding-repository";
import { createDrizzleAgentVersionRepository } from "./persistence/agent-version-repository";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import * as schema from "./persistence/schema";
import { createDrizzleSkillRepository } from "./persistence/skill-repository";
import { createDrizzleSkillVersionRepository } from "./persistence/skill-version-repository";

function createTransactionContext(
	client: PoolClient,
): AgentsTransactionContext {
	const db = drizzle(client, { schema });
	return {
		client,
		agentRepository: createDrizzleAgentRepository(db),
		agentVersionRepository: createDrizzleAgentVersionRepository(db),
		skillRepository: createDrizzleSkillRepository(db),
		skillVersionRepository: createDrizzleSkillVersionRepository(db),
		agentRoutineRepository: createDrizzleAgentRoutineRepository(db),
		agentBudgetRepository: createDrizzleAgentBudgetRepository(db),
		agentSkillBindingRepository: createDrizzleAgentSkillBindingRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createAgentsUnitOfWork(pool: Pool): AgentsUnitOfWork {
	return {
		async runInTransaction<T>(
			ctx: TenantContext | undefined,
			work: (context: AgentsTransactionContext) => Promise<T>,
		): Promise<T> {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				if (ctx !== undefined) {
					await applyTenantContext(client, ctx);
				}
				const context = createTransactionContext(client);
				const result = await work(context);
				await client.query("COMMIT");
				return result;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
	};
}
