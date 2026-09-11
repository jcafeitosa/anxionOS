import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	SimulationTransactionContext,
	SimulationUnitOfWork,
} from "../domain/ports/simulation-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgSimulationManifestRepository,
	createPgSimulationRunRepository,
	createPgSimulationSnapshotRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): SimulationTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		manifests: createPgSimulationManifestRepository(client),
		runs: createPgSimulationRunRepository(client),
		snapshots: createPgSimulationSnapshotRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createSimulationUnitOfWork(pool: Pool): SimulationUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: SimulationTransactionContext) => Promise<T>,
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
