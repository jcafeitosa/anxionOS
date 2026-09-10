import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	ExecutionTransactionContext,
	ExecutionUnitOfWork,
} from "../domain/ports/execution-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgExecutionFillRepository,
	createPgExecutionOrderRepository,
	createPgExecutionSessionRepository,
	createPgVenueAdapterRefRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): ExecutionTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		venueAdapterRefs: createPgVenueAdapterRefRepository(client),
		sessions: createPgExecutionSessionRepository(client),
		orders: createPgExecutionOrderRepository(client),
		fills: createPgExecutionFillRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createExecutionUnitOfWork(pool: Pool): ExecutionUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: ExecutionTransactionContext) => Promise<T>,
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
