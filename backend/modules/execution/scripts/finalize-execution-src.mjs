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
  executionCommandResultSchema,
  type ExecutionCommandResult,
  type ExecutionModuleErrorCode,
} from "@anxionos/contracts/execution";

export class ExecutionCommandError extends Error {
  readonly code: ExecutionModuleErrorCode;

  constructor(code: ExecutionModuleErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ExecutionCommandError";
  }
}

export function throwExecutionError(code: ExecutionModuleErrorCode, message: string): never {
  throw new ExecutionCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): ExecutionCommandResult {
  return executionCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    sessionId: snapshot.sessionId,
    orderId: snapshot.orderId,
    fillId: snapshot.fillId,
    venueFillId: snapshot.venueFillId,
  });
}
`,
);

write(
	"src/application/command-support.ts",
	`import type { ExecutionCommandResult } from "@anxionos/contracts/execution";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<ExecutionCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByClientOrderId(
  commandJournal: CommandJournalRepository,
  organizationId: string,
  clientOrderId: string,
): Promise<ExecutionCommandResult | null> {
  const existing = await commandJournal.findByClientOrderId(organizationId, clientOrderId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: ExecutionCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    sessionId: result.sessionId,
    orderId: result.orderId,
    fillId: result.fillId,
    venueFillId: result.venueFillId,
  };
}

export function multiplyDecimalAmounts(left: string, right: string): string {
  const product = Number.parseFloat(left) * Number.parseFloat(right);
  const fixed = product.toFixed(8);
  return fixed.replace(/\\.?0+$/, "") || "0";
}
`,
);

write(
	"src/domain/events/execution-events.ts",
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  EXECUTION_MODULE_EVENT_TYPES,
  EXECUTION_OWNER_DOMAIN,
} from "@anxionos/contracts/execution";

export function createSessionOpenedEvent(input: {
  sessionId: string;
  organizationId: string;
  intentHash: string;
  riskPermitId: string;
  authorityEpoch: number;
  riskEpoch: number;
  executionMode: string;
  venueAdapterRefId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: EXECUTION_MODULE_EVENT_TYPES.SESSION_OPENED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createOrderSubmittedEvent(input: {
  orderId: string;
  sessionId: string;
  organizationId: string;
  clientOrderId: string;
  instrumentId: string;
  side: string;
  quantity: string;
  price: string;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: EXECUTION_MODULE_EVENT_TYPES.ORDER_SUBMITTED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createFillConfirmedEvent(input: {
  eventId: string;
  organizationId: string;
  fillId: string;
  orderId: string;
  side: string;
  instrumentId: string;
  quantity: string;
  price: string;
  notionalAmount: string;
  asset: string;
  filledAt: string;
  executionMode: string;
  capitalAccountId?: string;
  portfolioId?: string;
}): DomainEventEnvelope {
  return {
    eventId: input.eventId,
    eventType: EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED,
    schemaVersion: "0.1.0",
    ownerDomain: EXECUTION_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`,
);

write(
	"src/infrastructure/execution-unit-of-work.ts",
	`import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  ExecutionTransactionContext,
  ExecutionUnitOfWork,
} from "../domain/ports/execution-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgExecutionFillRepository,
  createPgExecutionOrderRepository,
  createPgExecutionSessionRepository,
  createPgVenueAdapterRefRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): ExecutionTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    venueAdapterRefs: createPgVenueAdapterRefRepository(client),
    sessions: createPgExecutionSessionRepository(client),
    orders: createPgExecutionOrderRepository(client),
    fills: createPgExecutionFillRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createExecutionUnitOfWork(pool: Pool): ExecutionUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: ExecutionTransactionContext) => Promise<T>) {
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

export async function ensureExecutionSchema(poolOrClient: Pool | PoolClient): Promise<void> {
  const db = drizzle(poolOrClient);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureExecutionSchema(pool);
  await pool.end();
  console.log("execution migrations applied");
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
		"src/application/commands/open-execution-session.ts",
		"openExecutionSession",
		"OpenExecutionSessionDeps",
		"OpenExecutionSessionCommand",
	],
	[
		"src/application/commands/submit-order.ts",
		"submitOrder",
		"SubmitOrderDeps",
		"SubmitOrderCommand",
	],
]) {
	let c = read(rel);
	if (!c.includes(`${fn}(deps: ${depsType}`)) {
		c = c.replace(
			`export async function ${fn}(deps, input)`,
			`export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<ExecutionCommandResult>`,
		);
	}
	write(rel, c);
}

let submitOrder = read("src/application/commands/submit-order.ts");
if (submitOrder.includes("EX_ADAPTER_UNAVAILABLE")) {
	submitOrder = submitOrder.replace(
		'throwExecutionError("EX_ADAPTER_UNAVAILABLE", "simulated venue adapter is required")',
		'throwExecutionError("EX_MODE_FORBIDDEN", "simulated venue adapter is required")',
	);
	write("src/application/commands/submit-order.ts", submitOrder);
}

write(
	"src/infrastructure/persistence/repositories.ts",
	read("dist/infrastructure/persistence/repositories.js")
		.replace(
			/^function mapVenueAdapterRef/,
			`import type { PoolClient } from "pg";
import type {
  ExecutionFillRecord,
  ExecutionFillRepository,
  ExecutionOrderRecord,
  ExecutionOrderRepository,
  ExecutionSessionRecord,
  ExecutionSessionRepository,
  VenueAdapterRefRecord,
  VenueAdapterRefRepository,
} from "../../domain/ports/execution-unit-of-work";

function mapVenueAdapterRef`,
		)
		.replace(
			"function mapVenueAdapterRef(row) {",
			"function mapVenueAdapterRef(row: Record<string, unknown>): VenueAdapterRefRecord {",
		)
		.replace(
			"function mapSession(row) {",
			"function mapSession(row: Record<string, unknown>): ExecutionSessionRecord {",
		)
		.replace(
			"function mapOrder(row) {",
			"function mapOrder(row: Record<string, unknown>): ExecutionOrderRecord {",
		)
		.replace(
			"function mapFill(row) {",
			"function mapFill(row: Record<string, unknown>): ExecutionFillRecord {",
		)
		.replace(/id: row\.id,/g, "id: String(row.id),")
		.replace(
			/organizationId: row\.organization_id,/g,
			"organizationId: String(row.organization_id),",
		)
		.replace(
			/adapterKind: row\.adapter_kind,/g,
			"adapterKind: String(row.adapter_kind),",
		)
		.replace(/status: row\.status,/g, "status: String(row.status),")
		.replace(
			/intentHash: row\.intent_hash,/g,
			"intentHash: String(row.intent_hash),",
		)
		.replace(
			/riskPermitId: row\.risk_permit_id,/g,
			"riskPermitId: String(row.risk_permit_id),",
		)
		.replace(
			/authorityEpoch: row\.authority_epoch,/g,
			"authorityEpoch: Number(row.authority_epoch),",
		)
		.replace(
			/riskEpoch: row\.risk_epoch,/g,
			"riskEpoch: Number(row.risk_epoch),",
		)
		.replace(
			/executionMode: row\.execution_mode,/g,
			"executionMode: String(row.execution_mode),",
		)
		.replace(
			/venueAdapterRefId: row\.venue_adapter_ref_id,/g,
			"venueAdapterRefId: String(row.venue_adapter_ref_id),",
		)
		.replace(
			/sessionId: row\.session_id,/g,
			"sessionId: String(row.session_id),",
		)
		.replace(
			/clientOrderId: row\.client_order_id,/g,
			"clientOrderId: String(row.client_order_id),",
		)
		.replace(
			/instrumentId: row\.instrument_id,/g,
			"instrumentId: String(row.instrument_id),",
		)
		.replace(/side: row\.side,/g, "side: String(row.side),")
		.replace(/orderId: row\.order_id,/g, "orderId: String(row.order_id),")
		.replace(
			/venueFillId: row\.venue_fill_id,/g,
			"venueFillId: String(row.venue_fill_id),",
		)
		.replace(/asset: row\.asset,/g, "asset: String(row.asset),")
		.replace(
			/filledAt: new Date\(row\.filled_at\)\.toISOString\(\)/g,
			"filledAt: new Date(String(row.filled_at)).toISOString()",
		)
		.replace(
			"export function createPgVenueAdapterRefRepository(client) {",
			"export function createPgVenueAdapterRefRepository(client: PoolClient): VenueAdapterRefRepository {",
		)
		.replace(
			"export function createPgExecutionSessionRepository(client) {",
			"export function createPgExecutionSessionRepository(client: PoolClient): ExecutionSessionRepository {",
		)
		.replace(
			"export function createPgExecutionOrderRepository(client) {",
			"export function createPgExecutionOrderRepository(client: PoolClient): ExecutionOrderRepository {",
		)
		.replace(
			"export function createPgExecutionFillRepository(client) {",
			"export function createPgExecutionFillRepository(client: PoolClient): ExecutionFillRepository {",
		)
		.replace(
			/async save\(record\)/g,
			"async save(record: ExecutionFillRecord)",
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

let rp = read("src/infrastructure/risk-permit-validation.ts");
if (!rp.includes("Pool | PoolClient")) {
	rp = rp.replace(
		"export function createPgRiskPermitValidationPort(client)",
		'export function createPgRiskPermitValidationPort(client: import("pg").Pool | import("pg").PoolClient): RiskPermitValidationPort',
	);
	if (!rp.includes("RiskPermitValidationPort")) {
		rp = rp.replace(
			/^async function tableExists/,
			`import type { RiskPermitValidationPort } from "../domain/ports/risk-permit-validation";

async function tableExists`,
		);
	}
	write("src/infrastructure/risk-permit-validation.ts", rp);
}

let uowPort = read("src/domain/ports/execution-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
	uowPort = uowPort.replace(
		'import type { DomainEventEnvelope } from "@anxionos/contracts";',
		'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
	);
	write("src/domain/ports/execution-unit-of-work.ts", uowPort);
}

let simAdapter = read("src/infrastructure/adapters/simulated-venue-adapter.ts");
if (!simAdapter.includes("SimulatedVenuePort")) {
	simAdapter = simAdapter.replace(
		"export class SimulatedVenueAdapter {",
		`import type { SimulatedVenuePort } from "../../domain/ports/simulated-venue-port";

export class SimulatedVenueAdapter implements SimulatedVenuePort {`,
	);
	write("src/infrastructure/adapters/simulated-venue-adapter.ts", simAdapter);
}

for (const rel of [
	"src/application/commands/open-execution-session.ts",
	"src/application/commands/submit-order.ts",
]) {
	let c = read(rel);
	if (!c.includes("ExecutionCommandResult")) {
		c = c.replace(
			/from "@anxionos\/contracts\/execution";/,
			'from "@anxionos/contracts/execution";\nimport type { ExecutionCommandResult } from "@anxionos/contracts/execution";',
		);
	}
	write(rel, c);
}

console.log("finalized execution src");
