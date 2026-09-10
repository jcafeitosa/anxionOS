import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const write = (rel, c) => {
	fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
	fs.writeFileSync(path.join(root, rel), c);
};

write(
	"src/application/errors.ts",
	`import {
  auditCommandResultSchema,
  type AuditCommandResult,
  type AuditErrorCode,
} from "@anxionos/contracts/audit";

export class AuditCommandError extends Error {
  readonly code: AuditErrorCode;

  constructor(code: AuditErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AuditCommandError";
  }
}

export function throwAuditError(code: AuditErrorCode, message: string): never {
  throw new AuditCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): AuditCommandResult {
  return auditCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    manifestId: snapshot.manifestId,
    flightRecordId: snapshot.flightRecordId,
  });
}
`,
);

write(
	"src/application/command-support.ts",
	`import type { AuditCommandResult } from "@anxionos/contracts/audit";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<AuditCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentBySourceEventId(
  commandJournal: CommandJournalRepository,
  sourceEventId: string,
): Promise<AuditCommandResult | null> {
  const existing = await commandJournal.findBySourceEventId(sourceEventId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: AuditCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    manifestId: result.manifestId,
    flightRecordId: result.flightRecordId,
  };
}
`,
);

write(
	"src/domain/events/audit-events.ts",
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  AUDIT_EVENT_TYPES,
  AUDIT_OWNER_DOMAIN,
} from "@anxionos/contracts/audit";

export function createManifestRecordedEvent(input: {
  manifestId: string;
  flightRecordId: string;
  organizationId: string;
  sourceEventId: string;
  ownerDomain: string;
  eventType: string;
  occurredAt: string;
  payloadHash: string;
  recordedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: AUDIT_EVENT_TYPES.MANIFEST_RECORDED,
    schemaVersion: "0.1.0",
    ownerDomain: AUDIT_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`,
);

write(
	"src/infrastructure/audit-unit-of-work.ts",
	`import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  AuditTransactionContext,
  AuditUnitOfWork,
} from "../domain/ports/audit-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgAuditFlightRecorderRepository,
  createPgAuditManifestRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): AuditTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    manifests: createPgAuditManifestRepository(client),
    flightRecorderEntries: createPgAuditFlightRecorderRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createAuditUnitOfWork(pool: Pool): AuditUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: AuditTransactionContext) => Promise<T>) {
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
`,
);

write(
	"src/infrastructure/migrate.ts",
	`import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool, PoolClient } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureAuditSchema(poolOrClient: Pool | PoolClient): Promise<void> {
  const db = drizzle(poolOrClient);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureAuditSchema(pool);
  await pool.end();
  console.log("audit migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`,
);

for (const [rel, fn, depsType, cmdType] of [
	[
		"src/application/commands/ingest-domain-event-tap.ts",
		"ingestDomainEventTap",
		"IngestDomainEventTapDeps",
		"IngestDomainEventTapCommand",
	],
]) {
	let c = read(rel);
	if (!c.includes(`${fn}(deps: ${depsType}`)) {
		c = c.replace(
			`export async function ${fn}(deps, input)`,
			`export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<AuditCommandResult>`,
		);
	}
	if (!c.includes("type AuditCommandResult")) {
		c = c.replace(
			'import { auditCommandResultSchema, ingestDomainEventTapCommandSchema, } from "@anxionos/contracts/audit";',
			'import {\n  auditCommandResultSchema,\n  ingestDomainEventTapCommandSchema,\n  type AuditCommandResult,\n} from "@anxionos/contracts/audit";',
		);
	}
	write(rel, c);
}

write(
	"src/application/consumers/domain-event-tap-consumer.ts",
	`import { randomUUID } from "node:crypto";
import {
  mapDomainEventTapToAuditInput,
  type AuditCommandResult,
  type DomainEventTapBridge,
} from "@anxionos/contracts/audit";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AuditUnitOfWork } from "../../domain/ports/audit-unit-of-work";
import { ingestDomainEventTap } from "../commands/ingest-domain-event-tap";

export interface DomainEventTapConsumerDeps {
  unitOfWork: AuditUnitOfWork;
  commandJournal: CommandJournalRepository;
}

export function createDomainEventTapConsumer(deps: DomainEventTapConsumerDeps): {
  handle(tap: DomainEventTapBridge): Promise<AuditCommandResult>;
} {
  return {
    async handle(tap: DomainEventTapBridge) {
      const command = mapDomainEventTapToAuditInput(tap, randomUUID());
      return ingestDomainEventTap(
        { unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
        {
          commandId: command.commandId,
          organizationId: command.organizationId,
          sourceEventId: command.sourceEventId,
          ownerDomain: command.ownerDomain,
          eventType: command.eventType,
          occurredAt: command.occurredAt,
          payloadHash: command.payloadHash,
        },
      );
    },
  };
}
`,
);

write(
	"src/infrastructure/persistence/repositories.ts",
	read("dist/infrastructure/persistence/repositories.js")
		.replace(
			/^function mapManifest/,
			`import type { PoolClient } from "pg";
import type {
  AuditFlightRecorderEntryRecord,
  AuditFlightRecorderRepository,
  AuditManifestRecord,
  AuditManifestRepository,
} from "../../domain/ports/audit-unit-of-work";

function mapManifest`,
		)
		.replace(
			"function mapManifest(row) {",
			"function mapManifest(row: Record<string, unknown>): AuditManifestRecord {",
		)
		.replace(/id: row\.id,/g, "id: String(row.id),")
		.replace(
			/organizationId: row\.organization_id,/g,
			"organizationId: String(row.organization_id),",
		)
		.replace(
			/sourceEventId: row\.source_event_id,/g,
			"sourceEventId: String(row.source_event_id),",
		)
		.replace(
			/ownerDomain: row\.owner_domain,/g,
			"ownerDomain: String(row.owner_domain),",
		)
		.replace(
			/eventType: row\.event_type,/g,
			"eventType: String(row.event_type),",
		)
		.replace(
			/occurredAt: row\.occurred_at\.toISOString\(\)/g,
			"occurredAt: (row.occurred_at as Date).toISOString()",
		)
		.replace(
			/payloadHash: row\.payload_hash,/g,
			"payloadHash: String(row.payload_hash),",
		)
		.replace(
			/recordedAt: row\.recorded_at\.toISOString\(\)/g,
			"recordedAt: (row.recorded_at as Date).toISOString()",
		)
		.replace(
			"export function createPgAuditManifestRepository(client) {",
			"export function createPgAuditManifestRepository(client: PoolClient): AuditManifestRepository {",
		)
		.replace(
			"export function createPgAuditFlightRecorderRepository(client) {",
			"export function createPgAuditFlightRecorderRepository(client: PoolClient): AuditFlightRecorderRepository {",
		)
		.replace(
			/async save\(record\) \{\n {12}await client\.query\(`INSERT INTO audit_manifests/,
			"async save(record: AuditManifestRecord) {\n            await client.query(`INSERT INTO audit_manifests",
		)
		.replace(
			/async save\(record\) \{\n {12}await client\.query\(`INSERT INTO audit_flight_recorder_entries/,
			"async save(record: AuditFlightRecorderEntryRecord) {\n            await client.query(`INSERT INTO audit_flight_recorder_entries",
		),
);

let cj = read("src/infrastructure/persistence/command-journal-repository.ts");
if (!cj.includes("Pool | PoolClient")) {
	cj = cj.replace(
		"export function createPgCommandJournalRepository(client)",
		'export function createPgCommandJournalRepository(client: import("pg").Pool | import("pg").PoolClient)',
	);
	write("src/infrastructure/persistence/command-journal-repository.ts", cj);
}

let uowPort = read("src/domain/ports/audit-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
	uowPort = uowPort.replace(
		'import type { DomainEventEnvelope } from "@anxionos/contracts";',
		'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
	);
	write("src/domain/ports/audit-unit-of-work.ts", uowPort);
}

console.log("finalized audit src");
