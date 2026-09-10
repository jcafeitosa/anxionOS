import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	ConnectionsTransactionContext,
	ConnectionsUnitOfWork,
} from "../domain/ports/connections-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgAiAccountRepository,
	createPgBindingRepository,
	createPgInferenceRepository,
	createPgUsageRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): ConnectionsTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		aiAccounts: createPgAiAccountRepository(client),
		bindings: createPgBindingRepository(client),
		inferenceRequests: createPgInferenceRepository(client),
		usageRecords: createPgUsageRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createConnectionsUnitOfWork(pool: Pool): ConnectionsUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: ConnectionsTransactionContext) => Promise<T>,
		): Promise<T> {
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
