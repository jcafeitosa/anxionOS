import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  RiskTransactionContext,
  RiskUnitOfWork,
} from "../domain/ports/risk-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgCheckResultRepository,
  createPgEpochRegistryRepository,
  createPgLimitPolicyRepository,
  createPgPermitRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): RiskTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    limitPolicies: createPgLimitPolicyRepository(client),
    epochRegistry: createPgEpochRegistryRepository(client),
    checkResults: createPgCheckResultRepository(client),
    permits: createPgPermitRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createRiskUnitOfWork(pool: Pool): RiskUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: RiskTransactionContext) => Promise<T>) {
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
