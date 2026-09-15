import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../domain/ports/orchestration-unit-of-work";
import {
	createPostgresOperationalBudget,
	DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION,
	type OperationalBudgetQueryable,
} from "./adapters/postgres-operational-budget";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGateBindingRepository } from "./persistence/gate-binding-repository";
import { createDrizzleGoalRepository } from "./persistence/goal-repository";
import { createDrizzleRunHeartbeatRepository } from "./persistence/run-heartbeat-repository";
import { createDrizzleRunRepository } from "./persistence/run-repository";
import * as schema from "./persistence/schema";
import { createDrizzleTaskLeaseRepository } from "./persistence/task-lease-repository";
import { createDrizzleTaskRepository } from "./persistence/task-repository";
import { createDrizzleTaskboardMirrorRepository } from "./persistence/taskboard-mirror-repository";

export interface OrchestrationUnitOfWorkOptions {
	operationalBudgetCapPerOrganization?: number;
}

function createTransactionContext(
	client: import("pg").PoolClient,
	options: OrchestrationUnitOfWorkOptions,
) {
	const db = drizzle(client, { schema });
	return {
		client,
		goalRepository: createDrizzleGoalRepository(db),
		taskRepository: createDrizzleTaskRepository(db),
		runRepository: createDrizzleRunRepository(db),
		taskLeaseRepository: createDrizzleTaskLeaseRepository(db),
		gateBindingRepository: createDrizzleGateBindingRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		runHeartbeatRepository: createDrizzleRunHeartbeatRepository(db),
		taskboardMirrorRepository: createDrizzleTaskboardMirrorRepository(db),
		operationalBudget: createPostgresOperationalBudget(
			client as OperationalBudgetQueryable,
			{
				capPerOrganization:
					options.operationalBudgetCapPerOrganization ??
					DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION,
			},
		),
		async publishEvents(
			envelopes: import("@anxionos/contracts/events").DomainEventEnvelope[],
		) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}
export function createOrchestrationUnitOfWork(
	pool: Pool,
	options: OrchestrationUnitOfWorkOptions = {},
): OrchestrationUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (context: OrchestrationTransactionContext) => Promise<T>,
		) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const context = createTransactionContext(client, options);
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
