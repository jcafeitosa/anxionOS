import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	OperationsTransactionContext,
	OperationsUnitOfWork,
} from "../domain/ports/operations-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgHealthCheckRepository,
	createPgIncidentRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): OperationsTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		healthChecks: createPgHealthCheckRepository(client),
		incidents: createPgIncidentRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createOperationsUnitOfWork(pool: Pool): OperationsUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: OperationsTransactionContext) => Promise<T>,
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
