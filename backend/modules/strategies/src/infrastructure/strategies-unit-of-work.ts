import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	StrategiesTransactionContext,
	StrategiesUnitOfWork,
} from "../domain/ports/strategies-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgBacktestRunRepository,
	createPgDeploymentRepository,
	createPgSignalRepository,
	createPgStrategyRepository,
	createPgStrategyVersionRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): StrategiesTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		strategies: createPgStrategyRepository(client),
		versions: createPgStrategyVersionRepository(client),
		backtestRuns: createPgBacktestRunRepository(client),
		deployments: createPgDeploymentRepository(client),
		signals: createPgSignalRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createStrategiesUnitOfWork(pool: Pool): StrategiesUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: StrategiesTransactionContext) => Promise<T>,
		) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const ctx = createTransactionContext(client);
				const result = await work(ctx);
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
