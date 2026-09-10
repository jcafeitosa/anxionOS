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
  billingCommandResultSchema,
  type BillingCommandResult,
  type BillingErrorCode,
} from "@anxionos/contracts/billing";

export class BillingCommandError extends Error {
  readonly code: BillingErrorCode;

  constructor(code: BillingErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BillingCommandError";
  }
}

export function throwBillingError(code: BillingErrorCode, message: string): never {
  throw new BillingCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): BillingCommandResult {
  return billingCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    subscriptionId: snapshot.subscriptionId,
    invoiceId: snapshot.invoiceId,
    lineId: snapshot.lineId,
    usageAggregationId: snapshot.usageAggregationId,
  });
}
`,
);

write(
	"src/application/command-support.ts",
	`import type { BillingCommandResult } from "@anxionos/contracts/billing";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<BillingCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByUsageRecordId(
  commandJournal: CommandJournalRepository,
  usageRecordId: string,
): Promise<BillingCommandResult | null> {
  const existing = await commandJournal.findByUsageRecordId(usageRecordId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: BillingCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    subscriptionId: result.subscriptionId,
    invoiceId: result.invoiceId,
    lineId: result.lineId,
    usageAggregationId: result.usageAggregationId,
  };
}

export function multiplyDecimalAmount(quantity: number, unitPrice: string): string {
  const amount = quantity * Number.parseFloat(unitPrice);
  return amount.toFixed(8).replace(/\\.?0+$/, "") || "0";
}

export function addDecimalAmounts(left: string, right: string): string {
  const sum = Number.parseFloat(left) + Number.parseFloat(right);
  return sum.toFixed(8).replace(/\\.?0+$/, "") || "0";
}
`,
);

write(
	"src/domain/events/billing-events.ts",
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  BILLING_EVENT_TYPES,
  BILLING_OWNER_DOMAIN,
} from "@anxionos/contracts/billing";

export function createInvoiceIssuedEvent(input: {
  invoiceId: string;
  organizationId: string;
  subscriptionId: string;
  billingPeriod: string;
  totalAmount: string;
  issuedAt: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: BILLING_EVENT_TYPES.INVOICE_ISSUED,
    schemaVersion: "0.1.0",
    ownerDomain: BILLING_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`,
);

write(
	"src/infrastructure/billing-unit-of-work.ts",
	`import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  BillingTransactionContext,
  BillingUnitOfWork,
} from "../domain/ports/billing-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgInvoiceLineRepository,
  createPgInvoiceRepository,
  createPgSubscriptionRepository,
  createPgUsageAggregationRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): BillingTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    subscriptions: createPgSubscriptionRepository(client),
    invoices: createPgInvoiceRepository(client),
    invoiceLines: createPgInvoiceLineRepository(client),
    usageAggregations: createPgUsageAggregationRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createBillingUnitOfWork(pool: Pool): BillingUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: BillingTransactionContext) => Promise<T>) {
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

export async function ensureBillingSchema(poolOrClient: Pool | PoolClient): Promise<void> {
  const db = drizzle(poolOrClient);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureBillingSchema(pool);
  await pool.end();
  console.log("billing migrations applied");
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
		"src/application/commands/create-subscription.ts",
		"createSubscription",
		"CreateSubscriptionDeps",
		"CreateSubscriptionCommand",
	],
	[
		"src/application/commands/issue-invoice.ts",
		"issueInvoice",
		"IssueInvoiceDeps",
		"IssueInvoiceCommand",
	],
]) {
	let c = read(rel);
	if (!c.includes(`${fn}(deps: ${depsType}`)) {
		c = c.replace(
			`export async function ${fn}(deps, input)`,
			`export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<BillingCommandResult>`,
		);
	}
	write(rel, c);
}

let consumer = read("src/application/consumers/usage-recorded-consumer.ts");
if (!consumer.includes("ConnectionsUsageRecordedBridge")) {
	consumer = consumer.replace(
		'import { mapUsageRecordedToBillingInput } from "@anxionos/contracts/billing";',
		'import { mapUsageRecordedToBillingInput, type ConnectionsUsageRecordedBridge } from "@anxionos/contracts/billing";',
	);
}
if (!consumer.includes("handle(usage: ConnectionsUsageRecordedBridge)")) {
	consumer = consumer.replace(
		"async handle(usage)",
		"async handle(usage: ConnectionsUsageRecordedBridge)",
	);
}
if (
	!consumer.includes(
		"createUsageRecordedConsumer(deps: UsageRecordedConsumerDeps)",
	)
) {
	consumer = consumer.replace(
		"export function createUsageRecordedConsumer(deps)",
		"export function createUsageRecordedConsumer(deps: UsageRecordedConsumerDeps)",
	);
}
write("src/application/consumers/usage-recorded-consumer.ts", consumer);

write(
	"src/infrastructure/persistence/repositories.ts",
	read("dist/infrastructure/persistence/repositories.js")
		.replace(
			/^function mapSubscription/,
			`import type { PoolClient } from "pg";
import type {
  InvoiceLineRecord,
  InvoiceLineRepository,
  InvoiceRecord,
  InvoiceRepository,
  SubscriptionRecord,
  SubscriptionRepository,
  UsageAggregationRecord,
  UsageAggregationRepository,
} from "../../domain/ports/billing-unit-of-work";

function mapSubscription`,
		)
		.replace(
			"function mapSubscription(row) {",
			"function mapSubscription(row: Record<string, unknown>): SubscriptionRecord {",
		)
		.replace(/id: row\.id,/g, "id: String(row.id),")
		.replace(
			/organizationId: row\.organization_id,/g,
			"organizationId: String(row.organization_id),",
		)
		.replace(/planCode: row\.plan_code,/g, "planCode: String(row.plan_code),")
		.replace(
			/billingPeriodStart: row\.billing_period_start\.toISOString\(\)/g,
			"billingPeriodStart: (row.billing_period_start as Date).toISOString()",
		)
		.replace(
			/billingPeriodEnd: row\.billing_period_end\.toISOString\(\)/g,
			"billingPeriodEnd: (row.billing_period_end as Date).toISOString()",
		)
		.replace(/status: row\.status,/g, "status: String(row.status),")
		.replace(
			"function mapInvoice(row) {",
			"function mapInvoice(row: Record<string, unknown>): InvoiceRecord {",
		)
		.replace(
			/subscriptionId: row\.subscription_id,/g,
			"subscriptionId: String(row.subscription_id),",
		)
		.replace(
			/billingPeriod: row\.billing_period,/g,
			"billingPeriod: String(row.billing_period),",
		)
		.replace(
			/issuedAt: row\.issued_at \? row\.issued_at\.toISOString\(\) : null/g,
			"issuedAt: row.issued_at ? (row.issued_at as Date).toISOString() : null",
		)
		.replace(
			"function mapInvoiceLine(row) {",
			"function mapInvoiceLine(row: Record<string, unknown>): InvoiceLineRecord {",
		)
		.replace(
			/invoiceId: row\.invoice_id,/g,
			"invoiceId: String(row.invoice_id),",
		)
		.replace(
			/usageRecordId: row\.usage_record_id,/g,
			"usageRecordId: String(row.usage_record_id),",
		)
		.replace(
			/description: row\.description,/g,
			"description: String(row.description),",
		)
		.replace(
			"function mapUsageAggregation(row) {",
			"function mapUsageAggregation(row: Record<string, unknown>): UsageAggregationRecord {",
		)
		.replace(/unit: row\.unit,/g, "unit: String(row.unit),")
		.replace(
			/consumerKind: row\.consumer_kind,/g,
			"consumerKind: String(row.consumer_kind),",
		)
		.replace(
			"export function createPgSubscriptionRepository(client) {",
			"export function createPgSubscriptionRepository(client: PoolClient): SubscriptionRepository {",
		)
		.replace(
			"export function createPgInvoiceRepository(client) {",
			"export function createPgInvoiceRepository(client: PoolClient): InvoiceRepository {",
		)
		.replace(
			"export function createPgInvoiceLineRepository(client) {",
			"export function createPgInvoiceLineRepository(client: PoolClient): InvoiceLineRepository {",
		)
		.replace(
			"export function createPgUsageAggregationRepository(client) {",
			"export function createPgUsageAggregationRepository(client: PoolClient): UsageAggregationRepository {",
		)
		.replace(
			/async save\(record\)/g,
			"async save(record: SubscriptionRecord | InvoiceRecord | InvoiceLineRecord | UsageAggregationRecord)",
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

let uowPort = read("src/domain/ports/billing-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
	uowPort = uowPort.replace(
		'import type { DomainEventEnvelope } from "@anxionos/contracts";',
		'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
	);
	write("src/domain/ports/billing-unit-of-work.ts", uowPort);
}

console.log("finalized billing src");
