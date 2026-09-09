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
  evaluationCommandResultSchema,
  type EvaluationCommandResult,
  type EvaluationErrorCode,
} from "@anxionos/contracts/evaluation";

export class EvaluationCommandError extends Error {
  readonly code: EvaluationErrorCode;

  constructor(code: EvaluationErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "EvaluationCommandError";
  }
}

export function throwEvaluationError(code: EvaluationErrorCode, message: string): never {
  throw new EvaluationCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): EvaluationCommandResult {
  return evaluationCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    evaluationRecordId: snapshot.evaluationRecordId,
  });
}
`);

write("src/application/command-support.ts", `import type { EvaluationCommandResult } from "@anxionos/contracts/evaluation";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<EvaluationCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByOutcomeSnapshotId(
  commandJournal: CommandJournalRepository,
  journalEntryId: string,
): Promise<EvaluationCommandResult | null> {
  const existing = await commandJournal.findByOutcomeSnapshotId(journalEntryId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: EvaluationCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    evaluationRecordId: result.evaluationRecordId,
  };
}
`);

write("src/domain/events/evaluation-events.ts", `import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  EVALUATION_EVENT_TYPES,
  EVALUATION_OWNER_DOMAIN,
} from "@anxionos/contracts/evaluation";

export function createScoreComputedEvent(input: {
  evaluationRecordId: string;
  organizationId: string;
  journalEntryId: string;
  valueDate: string;
  linesSummary: Array<{
    accountCode: string;
    debit: string;
    credit: string;
    asset: string;
    amount: string;
  }>;
  recordedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: EVALUATION_EVENT_TYPES.SCORE_COMPUTED,
    schemaVersion: "0.1.0",
    ownerDomain: EVALUATION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`);

write("src/infrastructure/evaluation-unit-of-work.ts", `import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  EvaluationTransactionContext,
  EvaluationUnitOfWork,
} from "../domain/ports/evaluation-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgMetricSeriesRepository,
  createPgOutcomeSnapshotRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): EvaluationTransactionContext {
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

export function createEvaluationUnitOfWork(pool: Pool): EvaluationUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: EvaluationTransactionContext) => Promise<T>) {
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
import type { Pool, PoolClient } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureEvaluationSchema(poolOrClient: Pool | PoolClient): Promise<void> {
  const db = drizzle(poolOrClient);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureEvaluationSchema(pool);
  await pool.end();
  console.log("evaluation migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`);

for (const [rel, fn, depsType, cmdType] of [
  ["src/application/commands/record-outcome-snapshot.ts", "recordEvaluationScore", "RecordEvaluationScoreDeps", "RecordEvaluationScoreCommand"],
]) {
  let c = read(rel);
  if (!c.includes(`${fn}(deps: ${depsType}`)) {
    c = c.replace(
      `export async function ${fn}(deps, input)`,
      `export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<EvaluationCommandResult>`,
    );
  }
  write(rel, c);
}

let consumer = read("src/application/consumers/outcome-recorded-consumer.ts");
if (!consumer.includes("PerformanceOutcomeRecordedBridge")) {
  consumer = consumer.replace(
    'import { mapLedgerPostedToEvaluationInput } from "@anxionos/contracts/evaluation";',
    'import { mapLedgerPostedToEvaluationInput, type PerformanceOutcomeRecordedBridge } from "@anxionos/contracts/evaluation";',
  );
}
if (!consumer.includes("handle(outcome: PerformanceOutcomeRecordedBridge)")) {
  consumer = consumer.replace(
    "async handle(outcome)",
    "async handle(outcome: PerformanceOutcomeRecordedBridge)",
  );
}
write("src/application/consumers/outcome-recorded-consumer.ts", consumer);

write(
  "src/infrastructure/persistence/repositories.ts",
  read("dist/infrastructure/persistence/repositories.js")
    .replace(
      /^function mapOutcomeSnapshot/,
      `import type { PoolClient } from "pg";
import type {
  MetricSeriesRecord,
  MetricSeriesRepository,
  OutcomeSnapshotRecord,
  OutcomeSnapshotRepository,
} from "../../domain/ports/evaluation-unit-of-work";

function mapOutcomeSnapshot`,
    )
    .replace("function mapOutcomeSnapshot(row) {", "function mapOutcomeSnapshot(row: Record<string, unknown>): OutcomeSnapshotRecord {")
    .replace(/id: row\.id,/g, "id: String(row.id),")
    .replace(/organizationId: row\.organization_id,/g, "organizationId: String(row.organization_id),")
    .replace(/journalEntryId: row\.journal_entry_id,/g, "journalEntryId: String(row.journal_entry_id),")
    .replace(/valueDate: row\.value_date,/g, "valueDate: String(row.value_date),")
    .replace(/linesSummary: row\.lines_summary,/g, "linesSummary: row.lines_summary as OutcomeSnapshotRecord[\"linesSummary\"],")
    .replace(/recordedAt: row\.recorded_at\.toISOString\(\)/g, "recordedAt: (row.recorded_at as Date).toISOString()")
    .replace(
      "export function createPgOutcomeSnapshotRepository(client) {",
      "export function createPgOutcomeSnapshotRepository(client: PoolClient): OutcomeSnapshotRepository {",
    )
    .replace(
      "export function createPgMetricSeriesRepository(client) {",
      "export function createPgMetricSeriesRepository(client: PoolClient): MetricSeriesRepository {",
    )
    .replace(/async save\(record\)/g, "async save(record: OutcomeSnapshotRecord | MetricSeriesRecord)")
    .replace(/evaluationRecordId: row\.outcome_snapshot_id,/g, "evaluationRecordId: String(row.outcome_snapshot_id),")
    .replace(/metricName: row\.metric_name,/g, "metricName: String(row.metric_name),")
    .replace(/metricValue: row\.metric_value,/g, "metricValue: String(row.metric_value),")
    .replace(/observedAt: row\.observed_at/g, "observedAt: String(row.observed_at)"),
);

let cj = read("src/infrastructure/persistence/command-journal-repository.ts");
if (!cj.includes("Pool | PoolClient")) {
  cj = cj.replace(
    "export function createPgCommandJournalRepository(client)",
    "export function createPgCommandJournalRepository(client: import(\"pg\").Pool | import(\"pg\").PoolClient)",
  );
  write("src/infrastructure/persistence/command-journal-repository.ts", cj);
}

let uowPort = read("src/domain/ports/evaluation-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
  uowPort = uowPort.replace(
    'import type { DomainEventEnvelope } from "@anxionos/contracts";',
    'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
  );
  write("src/domain/ports/evaluation-unit-of-work.ts", uowPort);
}

console.log("finalized evaluation src");
