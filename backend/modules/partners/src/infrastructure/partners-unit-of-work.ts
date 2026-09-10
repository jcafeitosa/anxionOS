import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	PartnersTransactionContext,
	PartnersUnitOfWork,
} from "../domain/ports/partners-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgCommissionAccrualRepository,
	createPgPartnerRepository,
	createPgPayoutRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): PartnersTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		partners: createPgPartnerRepository(client),
		commissionAccruals: createPgCommissionAccrualRepository(client),
		payouts: createPgPayoutRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createPartnersUnitOfWork(pool: Pool): PartnersUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: PartnersTransactionContext) => Promise<T>,
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
