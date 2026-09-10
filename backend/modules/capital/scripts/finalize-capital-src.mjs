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
  capitalCommandResultSchema,
  type CapitalCommandResult,
  type CapitalErrorCode,
} from "@anxionos/contracts/capital";

export class CapitalCommandError extends Error {
  readonly code: CapitalErrorCode;

  constructor(code: CapitalErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CapitalCommandError";
  }
}

export function throwCapitalError(code: CapitalErrorCode, message: string): never {
  throw new CapitalCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): CapitalCommandResult {
  return capitalCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    accountId: snapshot.accountId,
    allocationId: snapshot.allocationId,
    reservationId: snapshot.reservationId,
  });
}
`,
);

write(
	"src/application/command-support.ts",
	`import type { CapitalCommandResult } from "@anxionos/contracts/capital";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<CapitalCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: CapitalCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    accountId: result.accountId,
    allocationId: result.allocationId,
    reservationId: result.reservationId,
  };
}
`,
);

write(
	"src/infrastructure/capital-unit-of-work.ts",
	`import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  CapitalTransactionContext,
  CapitalUnitOfWork,
} from "../domain/ports/capital-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgAllocationRepository,
  createPgBalanceLineRepository,
  createPgCapitalAccountRepository,
  createPgReservationRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): CapitalTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    accounts: createPgCapitalAccountRepository(client),
    balanceLines: createPgBalanceLineRepository(client),
    allocations: createPgAllocationRepository(client),
    reservations: createPgReservationRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createCapitalUnitOfWork(pool: Pool): CapitalUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: CapitalTransactionContext) => Promise<T>) {
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
import type { Pool } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureCapitalSchema(pool: Pool): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureCapitalSchema(pool);
  await pool.end();
  console.log("capital migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`,
);

write(
	"src/domain/events/capital-events.ts",
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  CAPITAL_EVENT_TYPES,
  CAPITAL_OWNER_DOMAIN,
} from "@anxionos/contracts/capital";

export function createAccountRegisteredEvent(input: {
  accountId: string;
  ownerUserId: string;
  baseCurrency: string;
  organizationId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: CAPITAL_EVENT_TYPES.ACCOUNT_REGISTERED,
    schemaVersion: "0.1.0",
    ownerDomain: CAPITAL_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createAllocationProposedEvent(input: {
  allocationId: string;
  accountId: string;
  grantId: string;
  portfolioId: string;
  organizationId: string;
  limitAmount: string;
  limitCurrency: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: CAPITAL_EVENT_TYPES.ALLOCATION_PROPOSED,
    schemaVersion: "0.1.0",
    ownerDomain: CAPITAL_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createReservationCreatedEvent(input: {
  reservationId: string;
  accountId: string;
  intentHash: string;
  amount: string;
  asset: string;
  organizationId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: CAPITAL_EVENT_TYPES.RESERVATION_CREATED,
    schemaVersion: "0.1.0",
    ownerDomain: CAPITAL_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`,
);

let gvp = read("src/domain/ports/grant-validation-port.ts");
gvp = gvp.replace(
	"async validateGrant(grantId)",
	"async validateGrant(grantId: string, _organizationId: string)",
);
write("src/domain/ports/grant-validation-port.ts", gvp);

for (const [rel, fn, depsType, cmdType] of [
	[
		"src/application/commands/register-capital-account.ts",
		"registerCapitalAccount",
		"RegisterCapitalAccountDeps",
		"RegisterCapitalAccountCommand",
	],
	[
		"src/application/commands/propose-allocation.ts",
		"proposeAllocation",
		"ProposeAllocationDeps",
		"ProposeAllocationCommand",
	],
	[
		"src/application/commands/reserve-for-intent.ts",
		"reserveForIntent",
		"ReserveForIntentDeps",
		"ReserveForIntentCommand",
	],
]) {
	let c = read(rel);
	c = c.replace(
		`export async function ${fn}(deps, input)`,
		`export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<CapitalCommandResult>`,
	);
	write(rel, c);
}

write(
	"src/infrastructure/persistence/repositories.ts",
	read("dist/infrastructure/persistence/repositories.js")
		.replace(
			/^function mapAccount/,
			`import type { PoolClient } from "pg";
import type {
  AllocationRecord,
  AllocationRepository,
  BalanceLineRecord,
  BalanceLineRepository,
  CapitalAccountRecord,
  CapitalAccountRepository,
  ReservationRecord,
  ReservationRepository,
} from "../../domain/ports/capital-unit-of-work";

function mapAccount`,
		)
		.replace(
			"function mapAccount(row) {",
			"function mapAccount(row: Record<string, unknown>): CapitalAccountRecord {",
		)
		.replace(
			"function mapBalanceLine(row) {",
			"function mapBalanceLine(row: Record<string, unknown>): BalanceLineRecord {",
		)
		.replace(
			"function mapReservation(row) {",
			"function mapReservation(row: Record<string, unknown>): ReservationRecord {",
		)
		.replace(/id: row\.id,/g, "id: String(row.id),")
		.replace(
			/organizationId: row\.organization_id,/g,
			"organizationId: String(row.organization_id),",
		)
		.replace(
			/ownerUserId: row\.owner_user_id,/g,
			"ownerUserId: String(row.owner_user_id),",
		)
		.replace(
			/baseCurrency: row\.base_currency,/g,
			"baseCurrency: String(row.base_currency),",
		)
		.replace(
			/executionMode: row\.execution_mode,/g,
			"executionMode: String(row.execution_mode),",
		)
		.replace(/status: row\.status,/g, "status: String(row.status),")
		.replace(/revision: row\.revision,/g, "revision: Number(row.revision),")
		.replace(
			/accountId: row\.account_id,/g,
			"accountId: String(row.account_id),",
		)
		.replace(/asset: row\.asset,/g, "asset: String(row.asset),")
		.replace(
			/portfolioId: row\.portfolio_id,/g,
			"portfolioId: String(row.portfolio_id),",
		)
		.replace(/grantId: row\.grant_id,/g, "grantId: String(row.grant_id),")
		.replace(
			/intentHash: row\.intent_hash,/g,
			"intentHash: String(row.intent_hash),",
		)
		.replace(
			/reservationKind: row\.reservation_kind,/g,
			"reservationKind: String(row.reservation_kind),",
		)
		.replace(
			"export function createPgCapitalAccountRepository(client) {",
			"export function createPgCapitalAccountRepository(client: PoolClient): CapitalAccountRepository {",
		)
		.replace(
			"export function createPgBalanceLineRepository(client) {",
			"export function createPgBalanceLineRepository(client: PoolClient): BalanceLineRepository {",
		)
		.replace(
			"export function createPgAllocationRepository(client) {",
			"export function createPgAllocationRepository(client: PoolClient): AllocationRepository {",
		)
		.replace(
			"export function createPgReservationRepository(client) {",
			"export function createPgReservationRepository(client: PoolClient): ReservationRepository {",
		)
		.replace(
			/async save\(record\)/g,
			"async save(record: CapitalAccountRecord | BalanceLineRecord | AllocationRecord | ReservationRecord)",
		)
		.replace(
			/return result\.rows\[0\]\.total;/g,
			"return String(result.rows[0].total);",
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

console.log("finalized capital src");
