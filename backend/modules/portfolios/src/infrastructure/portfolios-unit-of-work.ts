import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	PortfoliosTransactionContext,
	PortfoliosUnitOfWork,
} from "../domain/ports/portfolios-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgHoldingRepository,
	createPgPortfolioRepository,
	createPgPositionRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): PortfoliosTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		portfolios: createPgPortfolioRepository(client),
		positions: createPgPositionRepository(client),
		holdings: createPgHoldingRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createPortfoliosUnitOfWork(pool: Pool): PortfoliosUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: PortfoliosTransactionContext) => Promise<T>,
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
