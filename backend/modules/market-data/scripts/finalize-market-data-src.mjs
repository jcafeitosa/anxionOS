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
  marketDataCommandResultSchema,
  type MarketDataCommandResult,
  type MarketDataErrorCode,
} from "@anxionos/contracts/market-data";

export class MarketDataCommandError extends Error {
  readonly code: MarketDataErrorCode;

  constructor(code: MarketDataErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "MarketDataCommandError";
  }
}

export function throwMarketDataError(code: MarketDataErrorCode, message: string): never {
  throw new MarketDataCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): MarketDataCommandResult {
  return marketDataCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    instrumentId: snapshot.instrumentId,
    observationHeaderId: snapshot.observationHeaderId,
  });
}
`);

write("src/application/command-support.ts", `import type { MarketDataCommandResult } from "@anxionos/contracts/market-data";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<MarketDataCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: MarketDataCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    instrumentId: result.instrumentId,
    observationHeaderId: result.observationHeaderId,
  };
}
`);

write("src/domain/events/market-data-events.ts", `import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  MARKET_DATA_EVENT_TYPES,
  MARKET_DATA_OWNER_DOMAIN,
} from "@anxionos/contracts/market-data";

export function createInstrumentRegisteredEvent(input: {
  instrumentId: string;
  organizationId: string;
  canonicalSymbol: string;
  instrumentKind: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: MARKET_DATA_EVENT_TYPES.INSTRUMENT_REGISTERED,
    schemaVersion: "0.1.0",
    ownerDomain: MARKET_DATA_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createObservationRecordedEvent(input: {
  observationHeaderId: string;
  instrumentId: string;
  observationKind: string;
  sourceEventId: string;
  eventTime: string;
  price: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: MARKET_DATA_EVENT_TYPES.OBSERVATION_RECORDED,
    schemaVersion: "0.1.0",
    ownerDomain: MARKET_DATA_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`);

write("src/infrastructure/market-data-unit-of-work.ts", `import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
`);

write("src/infrastructure/migrate.ts", `import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureMarketDataSchema(pool: Pool): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureMarketDataSchema(pool);
  await pool.end();
  console.log("market-data migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`);

for (const [rel, fn, depsType, cmdType] of [
  ["src/application/commands/register-instrument.ts", "registerInstrument", "RegisterInstrumentDeps", "RegisterInstrumentCommand"],
  ["src/application/commands/record-observation.ts", "recordObservation", "RecordObservationDeps", "RecordObservationCommand"],
]) {
  let c = read(rel);
  if (!c.includes(`${fn}(deps: ${depsType}`)) {
    c = c.replace(
      `export async function ${fn}(deps, input)`,
      `export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<MarketDataCommandResult>`,
    );
  }
  write(rel, c);
}

let consumer = read("src/application/consumers/observed-consumer.ts");
if (!consumer.includes("ConnectionsMarketDataObservedV1")) {
  consumer = consumer.replace(
    'import { mapObservedToConfirmInput } from "@anxionos/contracts/market-data";',
    'import { mapObservedToConfirmInput, type ConnectionsMarketDataObservedV1 } from "@anxionos/contracts/market-data";',
  );
}
if (!consumer.includes("handle(observed: ConnectionsMarketDataObservedV1)")) {
  consumer = consumer.replace(
    "async handle(observed)",
    "async handle(observed: ConnectionsMarketDataObservedV1)",
  );
}
write("src/application/consumers/observed-consumer.ts", consumer);

write(
  "src/infrastructure/persistence/repositories.ts",
  read("dist/infrastructure/persistence/repositories.js")
    .replace(
      /^function mapInstrument/,
      `import type { PoolClient } from "pg";
import type {
  InstrumentRecord,
  InstrumentRepository,
  ObservationHeaderRecord,
  ObservationRepository,
} from "../../domain/ports/market-data-unit-of-work";

function mapInstrument`,
    )
    .replace("function mapInstrument(row) {", "function mapInstrument(row: Record<string, unknown>): InstrumentRecord {")
    .replace(/id: row\.id,/g, "id: String(row.id),")
    .replace(/organizationId: row\.organization_id,/g, "organizationId: String(row.organization_id),")
    .replace(/canonicalSymbol: row\.canonical_symbol,/g, "canonicalSymbol: String(row.canonical_symbol),")
    .replace(/instrumentKind: row\.instrument_kind,/g, "instrumentKind: String(row.instrument_kind),")
    .replace(/assetId: row\.asset_id,/g, "assetId: String(row.asset_id),")
    .replace(/venueId: row\.venue_id,/g, "venueId: String(row.venue_id),")
    .replace(/executionMode: row\.execution_mode,/g, "executionMode: String(row.execution_mode),")
    .replace(/status: row\.status,/g, "status: String(row.status),")
    .replace(/revision: row\.revision,/g, "revision: Number(row.revision),")
    .replace(
      "export function createPgInstrumentRepository(client) {",
      "export function createPgInstrumentRepository(client: PoolClient): InstrumentRepository {",
    )
    .replace(
      "export function createPgObservationRepository(client) {",
      "export function createPgObservationRepository(client: PoolClient): ObservationRepository {",
    )
    .replace(/async save\(record\)/g, "async save(record: InstrumentRecord)")
    .replace(/instrumentId: row\.instrument_id,/g, "instrumentId: String(row.instrument_id),")
    .replace(/observationKind: row\.observation_kind,/g, "observationKind: String(row.observation_kind),")
    .replace(/sourceEventId: row\.source_event_id,/g, "sourceEventId: String(row.source_event_id),")
    .replace(/eventTime: row\.event_time\.toISOString\(\)/g, "eventTime: (row.event_time as Date).toISOString()")
    .replace(/qualityFlag: row\.quality_flag,/g, "qualityFlag: String(row.quality_flag),")
    .replace(/async saveHeader\(record\)/g, "async saveHeader(record: ObservationHeaderRecord)")
    .replace(
      /async insertTimeseries\(record\)/,
      `async insertTimeseries(record: {
        eventTime: string;
        organizationId: string;
        instrumentId: string;
        observationHeaderId: string;
        observationKind: string;
        price: string;
        volume: string | null;
      })`,
    ),
);

let cj = read("src/infrastructure/persistence/command-journal-repository.ts");
if (!cj.includes("Pool | PoolClient")) {
  cj = cj.replace(
    "export function createPgCommandJournalRepository(client)",
    "export function createPgCommandJournalRepository(client: import(\"pg\").Pool | import(\"pg\").PoolClient)",
  );
  write("src/infrastructure/persistence/command-journal-repository.ts", cj);
}

let uowPort = read("src/domain/ports/market-data-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
  uowPort = uowPort.replace(
    'import type { DomainEventEnvelope } from "@anxionos/contracts";',
    'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
  );
  write("src/domain/ports/market-data-unit-of-work.ts", uowPort);
}

console.log("finalized market-data src");
