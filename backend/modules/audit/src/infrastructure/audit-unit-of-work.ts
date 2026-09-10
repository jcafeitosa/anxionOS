import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	AuditTransactionContext,
	AuditUnitOfWork,
} from "../domain/ports/audit-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgAuditFlightRecorderRepository,
	createPgAuditManifestRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): AuditTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		manifests: createPgAuditManifestRepository(client),
		flightRecorderEntries: createPgAuditFlightRecorderRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createAuditUnitOfWork(pool: Pool): AuditUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: AuditTransactionContext) => Promise<T>,
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
