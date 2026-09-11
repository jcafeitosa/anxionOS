import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	CapitalTransactionContext,
	CapitalUnitOfWork,
} from "../domain/ports/capital-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgAllocationRepository,
	createPgBalanceLineRepository,
	createPgCapitalAccountRepository,
	createPgReservationRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): CapitalTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		accounts: createPgCapitalAccountRepository(client),
		balanceLines: createPgBalanceLineRepository(client),
		allocations: createPgAllocationRepository(client),
		reservations: createPgReservationRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}
export function createCapitalUnitOfWork(pool: Pool): CapitalUnitOfWork {
	return {
		async runInTransaction(work) {
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
