import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const write = (rel, c) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), c);
};

write("src/application/errors.ts", `import {
  knowledgeCommandResultSchema,
  type KnowledgeCommandResult,
  type KnowledgeErrorCode,
} from "@anxionos/contracts/knowledge";

export class KnowledgeCommandError extends Error {
  readonly code: KnowledgeErrorCode;

  constructor(code: KnowledgeErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "KnowledgeCommandError";
  }
}

export function throwKnowledgeError(code: KnowledgeErrorCode, message: string): never {
  throw new KnowledgeCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): KnowledgeCommandResult {
  return knowledgeCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    documentId: snapshot.documentId,
    documentVersionId: snapshot.documentVersionId,
    indexGenerationId: snapshot.indexGenerationId,
  });
}
`);

write("src/application/command-support.ts", `import type { KnowledgeCommandResult } from "@anxionos/contracts/knowledge";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<KnowledgeCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: KnowledgeCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    documentId: result.documentId,
    documentVersionId: result.documentVersionId,
    indexGenerationId: result.indexGenerationId,
  };
}
`);

write("src/application/text-chunking.ts", `import { createHash } from "node:crypto";

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function splitIntoChunks(text: string, maxLen = 256): string[] {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    parts.push(text.slice(cursor, cursor + maxLen));
    cursor += maxLen;
  }
  return parts.length > 0 ? parts : [text];
}
`);

write("src/infrastructure/adapters/simulated-embedding-adapter.ts", `import { createHash } from "node:crypto";
import type { EmbeddingPort } from "../../domain/ports/embedding-port";

export const SIMULATED_EMBEDDING_DIMENSIONS = 1536;

function pseudoVector(seed: string, dimensions: number): number[] {
  const out: number[] = [];
  let hash = createHash("sha256").update(seed).digest();
  for (let i = 0; i < dimensions; i += 1) {
    const byte = hash[i % hash.length];
    out.push((byte / 255) * 2 - 1);
    if (i % 32 === 31) {
      hash = createHash("sha256").update(hash).digest();
    }
  }
  return out;
}

export function createSimulatedEmbeddingPort(): EmbeddingPort {
  return {
    async embedBatch(inputs) {
      return inputs.map((input) => ({
        chunkId: input.chunkId,
        dimensions: input.dimensions,
        vector: pseudoVector(\`\${input.chunkId}:\${input.text}\`, input.dimensions),
      }));
    },
  };
}
`);

write("src/infrastructure/knowledge-unit-of-work.ts", `import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
`);

write("src/infrastructure/migrate.ts", `import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureKnowledgeSchema(pool: Pool): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureKnowledgeSchema(pool);
  await pool.end();
  console.log("knowledge migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`);

// Fix command signatures
for (const rel of [
  "src/application/commands/register-knowledge-source.ts",
  "src/application/commands/ingest-document.ts",
  "src/application/commands/publish-index.ts",
]) {
  let c = read(rel);
  if (rel.includes("register-knowledge-source")) {
    c = c.replace(
      "export async function registerKnowledgeSource(deps, input)",
      "export async function registerKnowledgeSource(deps: RegisterKnowledgeSourceDeps, input: RegisterKnowledgeSourceCommand): Promise<KnowledgeCommandResult>",
    );
  }
  if (rel.includes("ingest-document")) {
    c = c.replace(
      "export async function ingestDocument(deps, input)",
      "export async function ingestDocument(deps: IngestDocumentDeps, input: IngestDocumentCommand): Promise<KnowledgeCommandResult>",
    );
    if (!c.includes("IngestDocumentCommand")) {
      c = c.replace(
        'import { ingestDocumentCommandSchema, knowledgeCommandResultSchema, } from "@anxionos/contracts/knowledge";',
        'import { ingestDocumentCommandSchema, knowledgeCommandResultSchema, type IngestDocumentCommand, } from "@anxionos/contracts/knowledge";',
      );
    }
  }
  if (rel.includes("publish-index")) {
    c = c.replace(
      "export async function publishIndex(deps, input)",
      "export async function publishIndex(deps: PublishIndexDeps, input: PublishIndexCommand): Promise<KnowledgeCommandResult>",
    );
  }
  write(rel, c);
}

// Rewrite repositories with proper typing
write("src/infrastructure/persistence/repositories.ts", read("dist/infrastructure/persistence/repositories.js")
  .replace(/^import \{ createHash \} from "node:crypto";/, 'import { createHash } from "node:crypto";\nimport type { PoolClient } from "pg";\nimport type {\n  ChunkRecord,\n  ChunkRepository,\n  DocumentRecord,\n  DocumentRepository,\n  DocumentVersionRecord,\n  DocumentVersionRepository,\n  EmbeddingRepository,\n  EmbeddingSpaceRecord,\n  EmbeddingSpaceRepository,\n  IndexGenerationRecord,\n  IndexGenerationRepository,\n  KnowledgeSourceRecord,\n  KnowledgeSourceRepository,\n} from "../../domain/ports/knowledge-unit-of-work";')
  .replace("function mapSource(row) {", "function mapSource(row: Record<string, unknown>): KnowledgeSourceRecord {")
  .replace(/id: row\.id,/g, "id: String(row.id),")
  .replace(/organizationId: row\.organization_id,/g, "organizationId: String(row.organization_id),")
  .replace(/displayName: row\.display_name,/g, "displayName: String(row.display_name),")
  .replace(/sourceKind: row\.source_kind,/g, "sourceKind: String(row.source_kind),")
  .replace(/defaultClassification: row\.default_classification,/g, "defaultClassification: String(row.default_classification),")
  .replace(/defaultAclId: row\.default_acl_id,/g, "defaultAclId: String(row.default_acl_id),")
  .replace(/defaultAclEpoch: row\.default_acl_epoch,/g, "defaultAclEpoch: Number(row.default_acl_epoch),")
  .replace(/status: row\.status,/g, "status: String(row.status),")
  .replace(/revision: row\.revision,/g, "revision: Number(row.revision),")
  .replace("export function createPgKnowledgeSourceRepository(client) {", "export function createPgKnowledgeSourceRepository(client: PoolClient): KnowledgeSourceRepository {")
  .replace("export function createPgDocumentRepository(client) {", "export function createPgDocumentRepository(client: PoolClient): DocumentRepository {")
  .replace("export function createPgDocumentVersionRepository(client) {", "export function createPgDocumentVersionRepository(client: PoolClient): DocumentVersionRepository {")
  .replace("export function createPgIndexGenerationRepository(client) {", "export function createPgIndexGenerationRepository(client: PoolClient): IndexGenerationRepository {")
  .replace("export function createPgChunkRepository(client) {", "export function createPgChunkRepository(client: PoolClient): ChunkRepository {")
  .replace("export function createPgEmbeddingRepository(client) {", "export function createPgEmbeddingRepository(client: PoolClient): EmbeddingRepository {")
  .replace("export function createPgEmbeddingSpaceRepository(client) {", "export function createPgEmbeddingSpaceRepository(client: PoolClient): EmbeddingSpaceRepository {")
  .replace(/knowledgeSourceId: row\.knowledge_source_id,/g, "knowledgeSourceId: String(row.knowledge_source_id),")
  .replace(/title: row\.title,/g, "title: String(row.title),")
  .replace(/classification: row\.classification,/g, "classification: String(row.classification),")
  .replace(/aclId: row\.acl_id,/g, "aclId: String(row.acl_id),")
  .replace(/aclEpoch: row\.acl_epoch,/g, "aclEpoch: Number(row.acl_epoch),")
  .replace(/activeVersionId: row\.active_version_id,/g, "activeVersionId: row.active_version_id ? String(row.active_version_id) : null,")
  .replace(/documentId: row\.document_id,/g, "documentId: String(row.document_id),")
  .replace(/versionNumber: row\.version_number,/g, "versionNumber: Number(row.version_number),")
  .replace(/contentHash: row\.content_hash,/g, "contentHash: String(row.content_hash),")
  .replace(/blobBucket: row\.blob_bucket,/g, "blobBucket: String(row.blob_bucket),")
  .replace(/blobObjectKey: row\.blob_object_key,/g, "blobObjectKey: String(row.blob_object_key),")
  .replace(/mimeType: row\.mime_type,/g, "mimeType: String(row.mime_type),")
  .replace(/byteSize: row\.byte_size,/g, "byteSize: Number(row.byte_size),")
  .replace(/documentVersionId: row\.document_version_id,/g, "documentVersionId: String(row.document_version_id),")
  .replace(/embeddingSpaceId: row\.embedding_space_id,/g, "embeddingSpaceId: String(row.embedding_space_id),")
  .replace(/chunkCount: row\.chunk_count,/g, "chunkCount: Number(row.chunk_count),")
  .replace(/embeddedCount: row\.embedded_count,/g, "embeddedCount: Number(row.embedded_count),")
  .replace(/indexGenerationId: row\.index_generation_id,/g, "indexGenerationId: String(row.index_generation_id),")
  .replace(/sequence: row\.sequence,/g, "sequence: Number(row.sequence),")
  .replace(/tokenCount: row\.token_count,/g, "tokenCount: Number(row.token_count),")
  .replace(/modelRef: row\.model_ref,/g, "modelRef: String(row.model_ref),")
  .replace(/dimensions: row\.dimensions,/g, "dimensions: Number(row.dimensions),")
  .replace(/return result.rows\[0\]\.c;/g, "return Number(result.rows[0].c);")
  .replace(/return result.rows.map\(\(row\) => \(/g, "return result.rows.map((row: Record<string, unknown>) => (")
  .replace(/id: row\.id,/g, "id: String(row.id),")
  .replace(/contentHash: row\.content_hash,/g, "contentHash: String(row.content_hash),")
  .replace("export function hashText(text) {", "export function hashText(text: string): string {")
  .replace("export function splitIntoChunks(text, maxLen = 256) {", "export function splitIntoChunks(text: string, maxLen = 256): string[] {")
  .replace(/async saveMany\(records\)/, "async saveMany(records: ChunkRecord[])")
  .replace(/async save\(record\)/g, "async save(record: KnowledgeSourceRecord | DocumentRecord | DocumentVersionRecord | IndexGenerationRecord | EmbeddingSpaceRecord | { id: string; organizationId: string; chunkId: string; embeddingSpaceId: string; dimensions: number; vector: number[] })")
);

let cj = read("src/infrastructure/persistence/command-journal-repository.ts");
cj = cj.replace(
  "export function createPgCommandJournalRepository(client)",
  "export function createPgCommandJournalRepository(client: import(\"pg\").Pool | import(\"pg\").PoolClient)",
);
write("src/infrastructure/persistence/command-journal-repository.ts", cj);

console.log("finalized knowledge src");
