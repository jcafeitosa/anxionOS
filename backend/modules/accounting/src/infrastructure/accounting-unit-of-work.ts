import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  AccountingTransactionContext,
  AccountingUnitOfWork,
} from "../domain/ports/accounting-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgChartAccountRepository,
  createPgJournalEntryRepository,
  createPgLedgerPostingRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): AccountingTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    chartAccounts: createPgChartAccountRepository(client),
    journalEntries: createPgJournalEntryRepository(client),
    ledgerPostings: createPgLedgerPostingRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createAccountingUnitOfWork(pool: Pool): AccountingUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: AccountingTransactionContext) => Promise<T>) {
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
