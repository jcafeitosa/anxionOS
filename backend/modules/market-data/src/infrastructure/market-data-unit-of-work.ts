import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  MarketDataTransactionContext,
  MarketDataUnitOfWork,
} from "../domain/ports/market-data-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgInstrumentRepository,
  createPgObservationRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): MarketDataTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    instruments: createPgInstrumentRepository(client),
    observations: createPgObservationRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createMarketDataUnitOfWork(pool: Pool): MarketDataUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: MarketDataTransactionContext) => Promise<T>) {
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
