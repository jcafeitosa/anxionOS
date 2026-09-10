import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
	PerformanceTransactionContext,
	PerformanceUnitOfWork,
} from "../domain/ports/performance-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
	createPgMetricSeriesRepository,
	createPgOutcomeSnapshotRepository,
} from "./persistence/repositories";

function createTransactionContext(
	client: PoolClient,
): PerformanceTransactionContext {
	return {
		commandJournal: createPgCommandJournalRepository(client),
		outcomeSnapshots: createPgOutcomeSnapshotRepository(client),
		metricSeries: createPgMetricSeriesRepository(client),
		async publishEvents(envelopes: DomainEventEnvelope[]) {
			for (const envelope of envelopes) {
				await appendJournal(client, envelope);
				await enqueueOutbox(client, envelope);
			}
		},
	};
}

export function createPerformanceUnitOfWork(pool: Pool): PerformanceUnitOfWork {
	return {
		async runInTransaction<T>(
			work: (ctx: PerformanceTransactionContext) => Promise<T>,
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
