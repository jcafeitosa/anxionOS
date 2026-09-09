import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  KnowledgeTransactionContext,
  KnowledgeUnitOfWork,
} from "../domain/ports/knowledge-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgChunkRepository,
  createPgDocumentRepository,
  createPgDocumentVersionRepository,
  createPgEmbeddingRepository,
  createPgEmbeddingSpaceRepository,
  createPgIndexGenerationRepository,
  createPgKnowledgeSourceRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): KnowledgeTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    sources: createPgKnowledgeSourceRepository(client),
    documents: createPgDocumentRepository(client),
    documentVersions: createPgDocumentVersionRepository(client),
    indexGenerations: createPgIndexGenerationRepository(client),
    chunks: createPgChunkRepository(client),
    embeddings: createPgEmbeddingRepository(client),
    embeddingSpaces: createPgEmbeddingSpaceRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createKnowledgeUnitOfWork(pool: Pool): KnowledgeUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: KnowledgeTransactionContext) => Promise<T>) {
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
