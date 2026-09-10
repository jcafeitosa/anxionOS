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
  accountingCommandResultSchema,
  type AccountingCommandResult,
  type AccountingErrorCode,
} from "@anxionos/contracts/accounting";

export class AccountingCommandError extends Error {
  readonly code: AccountingErrorCode;

  constructor(code: AccountingErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "AccountingCommandError";
  }
}

export function throwAccountingError(code: AccountingErrorCode, message: string): never {
  throw new AccountingCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): AccountingCommandResult {
  return accountingCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    entryId: snapshot.entryId,
  });
}
`,
);

write(
	"src/application/command-support.ts",
	`import type { AccountingCommandResult } from "@anxionos/contracts/accounting";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<AccountingCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: AccountingCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    entryId: result.entryId,
  };
}
`,
);

write(
	"src/domain/events/accounting-events.ts",
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  ACCOUNTING_EVENT_TYPES,
  ACCOUNTING_OWNER_DOMAIN,
} from "@anxionos/contracts/accounting";

export function createLedgerPostedEvent(input: {
  entryId: string;
  organizationId: string;
  idempotencyKey: string;
  entryKind: string;
  linesSummary: Array<{
    accountCode: string;
    debit: string;
    credit: string;
    asset: string;
    amount: string;
  }>;
  valueDate: string;
  capitalAccountId?: string;
  portfolioId?: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: ACCOUNTING_EVENT_TYPES.LEDGER_POSTED,
    schemaVersion: "0.1.0",
    ownerDomain: ACCOUNTING_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`,
);

write(
	"src/infrastructure/accounting-unit-of-work.ts",
	`import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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

export async function ensureAccountingSchema(poolOrClient: Pool | PoolClient): Promise<void> {
  const db = drizzle(poolOrClient);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureAccountingSchema(pool);
  await pool.end();
  console.log("accounting migrations applied");
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
		"src/application/commands/post-ledger-entry.ts",
		"postLedgerEntry",
		"PostLedgerEntryDeps",
		"PostLedgerEntryCommand",
	],
	[
		"src/application/commands/post-trade-fill.ts",
		"postTradeFill",
		"PostTradeFillDeps",
		"PostTradeFillCommand",
	],
]) {
	let c = read(rel);
	if (!c.includes(`${fn}(deps: ${depsType}`)) {
		c = c.replace(
			`export async function ${fn}(deps, input)`,
			`export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<AccountingCommandResult>`,
		);
	}
	write(rel, c);
}

write(
	"src/application/consumers/fill-confirmed-consumer.ts",
	`import { randomUUID } from "node:crypto";
import {
  mapFillConfirmedToPostTradeFill,
  type AccountingCommandResult,
  type ExecutionFillConfirmedV1,
} from "@anxionos/contracts/accounting";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AccountingUnitOfWork } from "../../domain/ports/accounting-unit-of-work";
import { postTradeFill } from "../commands/post-trade-fill";

export interface FillConfirmedConsumerDeps {
  unitOfWork: AccountingUnitOfWork;
  commandJournal: CommandJournalRepository;
}

export function createFillConfirmedConsumer(deps: FillConfirmedConsumerDeps): {
  handle(fill: ExecutionFillConfirmedV1): Promise<AccountingCommandResult>;
} {
  return {
    async handle(fill: ExecutionFillConfirmedV1) {
      const command = mapFillConfirmedToPostTradeFill(fill, randomUUID());
      return postTradeFill(
        { unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
        command,
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
			/^const DEFAULT_CHART_ACCOUNTS/,
			`import type { PoolClient } from "pg";
import type {
  ChartAccountRecord,
  ChartAccountRepository,
  JournalEntryRecord,
  JournalEntryRepository,
  LedgerPostingRecord,
  LedgerPostingRepository,
} from "../../domain/ports/accounting-unit-of-work";

import { randomUUID } from "node:crypto";`,
		)
		.replace(
			"function mapChartAccount(row) {",
			"function mapChartAccount(row: Record<string, unknown>): ChartAccountRecord {",
		)
		.replace(/id: row\.id,/g, "id: String(row.id),")
		.replace(
			/organizationId: row\.organization_id,/g,
			"organizationId: String(row.organization_id),",
		)
		.replace(/code: row\.code,/g, "code: String(row.code),")
		.replace(/kind: row\.kind,/g, "kind: String(row.kind),")
		.replace(/currency: row\.currency,/g, "currency: String(row.currency),")
		.replace(/status: row\.status,/g, "status: String(row.status),")
		.replace(
			"function mapJournalEntry(row) {",
			"function mapJournalEntry(row: Record<string, unknown>): JournalEntryRecord {",
		)
		.replace(
			/entryKind: row\.entry_kind,/g,
			"entryKind: String(row.entry_kind),",
		)
		.replace(
			/idempotencyKey: row\.idempotency_key,/g,
			"idempotencyKey: String(row.idempotency_key),",
		)
		.replace(
			/sourceRef: row\.source_ref,/g,
			"sourceRef: row.source_ref as Record<string, unknown> | null,",
		)
		.replace(
			/executionMode: row\.execution_mode,/g,
			"executionMode: String(row.execution_mode),",
		)
		.replace(
			/capitalAccountId: row\.capital_account_id,/g,
			"capitalAccountId: row.capital_account_id ? String(row.capital_account_id) : null,",
		)
		.replace(
			/portfolioId: row\.portfolio_id,/g,
			"portfolioId: row.portfolio_id ? String(row.portfolio_id) : null,",
		)
		.replace(/revision: row\.revision,/g, "revision: Number(row.revision),")
		.replace(
			"function mapLedgerPosting(row) {",
			"function mapLedgerPosting(row: Record<string, unknown>): LedgerPostingRecord {",
		)
		.replace(
			/journalEntryId: row\.journal_entry_id,/g,
			"journalEntryId: String(row.journal_entry_id),",
		)
		.replace(
			/accountCode: row\.account_code,/g,
			"accountCode: String(row.account_code),",
		)
		.replace(/asset: row\.asset,/g, "asset: String(row.asset),")
		.replace(
			"export function createPgChartAccountRepository(client) {",
			"export function createPgChartAccountRepository(client: PoolClient): ChartAccountRepository {",
		)
		.replace(
			"export function createPgJournalEntryRepository(client) {",
			"export function createPgJournalEntryRepository(client: PoolClient): JournalEntryRepository {",
		)
		.replace(
			"export function createPgLedgerPostingRepository(client) {",
			"export function createPgLedgerPostingRepository(client: PoolClient): LedgerPostingRepository {",
		)
		.replace(
			/async save\(record\)/g,
			"async save(record: JournalEntryRecord | LedgerPostingRecord)",
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

let uowPort = read("src/domain/ports/accounting-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
	uowPort = uowPort.replace(
		'import type { DomainEventEnvelope } from "@anxionos/contracts";',
		'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
	);
	write("src/domain/ports/accounting-unit-of-work.ts", uowPort);
}

let balanceValidation = read("src/application/balance-validation.ts");
if (balanceValidation.includes('from "@anxionos/contracts"')) {
	balanceValidation = balanceValidation.replace(
		'import type { LedgerLine } from "@anxionos/contracts";',
		'import type { LedgerLine } from "@anxionos/contracts/accounting";',
	);
	write("src/application/balance-validation.ts", balanceValidation);
}

console.log("finalized accounting src");
