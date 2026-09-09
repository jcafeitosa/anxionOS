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
  riskCommandResultSchema,
  type RiskCommandResult,
  type RiskErrorCode,
} from "@anxionos/contracts/risk";

export class RiskCommandError extends Error {
  readonly code: RiskErrorCode;

  constructor(code: RiskErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "RiskCommandError";
  }
}

export function throwRiskError(code: RiskErrorCode, message: string): never {
  throw new RiskCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): RiskCommandResult {
  return riskCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    policyId: snapshot.policyId,
    checkId: snapshot.checkId,
    permitId: snapshot.permitId,
    checkResult: snapshot.checkResult,
    denyReasonCode: snapshot.denyReasonCode,
  });
}
`);

write("src/application/command-support.ts", `import type { RiskCommandResult } from "@anxionos/contracts/risk";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<RiskCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export async function loadIdempotentByIntentHash(
  commandJournal: CommandJournalRepository,
  organizationId: string,
  intentHash: string,
): Promise<RiskCommandResult | null> {
  const existing = await commandJournal.findByIntentHash(organizationId, intentHash);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: RiskCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    policyId: result.policyId,
    checkId: result.checkId,
    permitId: result.permitId,
    checkResult: result.checkResult,
    denyReasonCode: result.denyReasonCode,
  };
}

export function compareDecimalAmounts(left: string, right: string): number {
  const a = Number.parseFloat(left);
  const b = Number.parseFloat(right);
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}
`);

write("src/domain/events/risk-events.ts", `import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  RISK_EVENT_TYPES,
  RISK_OWNER_DOMAIN,
} from "@anxionos/contracts/risk";

export function createCheckCompletedEvent(input: {
  checkId: string;
  organizationId: string;
  portfolioId: string;
  intentHash: string;
  checkResult: string;
  denyReasonCode?: string;
  notionalAmount: string;
  authorityEpoch: number;
  riskEpoch: number;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: RISK_EVENT_TYPES.CHECK_COMPLETED,
    schemaVersion: "0.1.0",
    ownerDomain: RISK_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createPermitIssuedEvent(input: {
  permitId: string;
  checkId: string;
  organizationId: string;
  intentHash: string;
  authorityEpoch: number;
  riskEpoch: number;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: RISK_EVENT_TYPES.PERMIT_ISSUED,
    schemaVersion: "0.1.0",
    ownerDomain: RISK_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`);

write("src/infrastructure/risk-unit-of-work.ts", `import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
`);

write("src/infrastructure/migrate.ts", `import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Pool } from "pg";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export async function ensureRiskSchema(pool: Pool): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureRiskSchema(pool);
  await pool.end();
  console.log("risk migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`);

for (const [rel, fn, depsType, cmdType] of [
  ["src/application/commands/activate-limit-policy.ts", "activateLimitPolicy", "ActivateLimitPolicyDeps", "ActivateLimitPolicyCommand"],
  ["src/application/commands/run-pre-trade-check.ts", "runPreTradeCheck", "RunPreTradeCheckDeps", "RunPreTradeCheckCommand"],
]) {
  let c = read(rel);
  if (!c.includes(`${fn}(deps: ${depsType}`)) {
    c = c.replace(
      `export async function ${fn}(deps, input)`,
      `export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<RiskCommandResult>`,
    );
  }
  write(rel, c);
}

write(
  "src/infrastructure/persistence/repositories.ts",
  read("dist/infrastructure/persistence/repositories.js")
    .replace(
      /^function mapPolicy/,
      `import type { PoolClient } from "pg";
import type {
  CheckResultRecord,
  CheckResultRepository,
  EpochRegistryRecord,
  EpochRegistryRepository,
  LimitPolicyRecord,
  LimitPolicyRepository,
  PermitRecord,
  PermitRepository,
} from "../../domain/ports/risk-unit-of-work";

function mapPolicy`,
    )
    .replace("function mapPolicy(row) {", "function mapPolicy(row: Record<string, unknown>): LimitPolicyRecord {")
    .replace("function mapEpoch(row) {", "function mapEpoch(row: Record<string, unknown>): EpochRegistryRecord {")
    .replace("function mapCheck(row) {", "function mapCheck(row: Record<string, unknown>): CheckResultRecord {")
    .replace("function mapPermit(row) {", "function mapPermit(row: Record<string, unknown>): PermitRecord {")
    .replace(/id: row\.id,/g, "id: String(row.id),")
    .replace(/organizationId: row\.organization_id,/g, "organizationId: String(row.organization_id),")
    .replace(/policyVersion: row\.policy_version,/g, "policyVersion: String(row.policy_version),")
    .replace(/riskEpoch: row\.risk_epoch,/g, "riskEpoch: Number(row.risk_epoch),")
    .replace(/status: row\.status,/g, "status: String(row.status),")
    .replace(/currentRiskEpoch: row\.current_risk_epoch,/g, "currentRiskEpoch: Number(row.current_risk_epoch),")
    .replace(/portfolioId: row\.portfolio_id,/g, "portfolioId: String(row.portfolio_id),")
    .replace(/intentHash: row\.intent_hash,/g, "intentHash: String(row.intent_hash),")
    .replace(/authorityEpoch: row\.authority_epoch,/g, "authorityEpoch: Number(row.authority_epoch),")
    .replace(/executionMode: row\.execution_mode,/g, "executionMode: String(row.execution_mode),")
    .replace(/checkResult: row\.check_result,/g, "checkResult: String(row.check_result),")
    .replace(/denyReasonCode: row\.deny_reason_code/g, "denyReasonCode: row.deny_reason_code != null ? String(row.deny_reason_code)")
    .replace(/checkId: row\.check_id,/g, "checkId: String(row.check_id),")
    .replace(
      "export function createPgLimitPolicyRepository(client) {",
      "export function createPgLimitPolicyRepository(client: PoolClient): LimitPolicyRepository {",
    )
    .replace(
      "export function createPgEpochRegistryRepository(client) {",
      "export function createPgEpochRegistryRepository(client: PoolClient): EpochRegistryRepository {",
    )
    .replace(
      "export function createPgCheckResultRepository(client) {",
      "export function createPgCheckResultRepository(client: PoolClient): CheckResultRepository {",
    )
    .replace(
      "export function createPgPermitRepository(client) {",
      "export function createPgPermitRepository(client: PoolClient): PermitRepository {",
    )
    .replace(/async save\(record\)/g, "async save(record: LimitPolicyRecord | CheckResultRecord | PermitRecord)"),
);

let cj = read("src/infrastructure/persistence/command-journal-repository.ts");
if (!cj.includes("Pool | PoolClient")) {
  cj = cj.replace(
    "export function createPgCommandJournalRepository(client)",
    "export function createPgCommandJournalRepository(client: import(\"pg\").Pool | import(\"pg\").PoolClient)",
  );
  write("src/infrastructure/persistence/command-journal-repository.ts", cj);
}

let uowPort = read("src/domain/ports/risk-unit-of-work.ts");
if (uowPort.includes('from "@anxionos/contracts"')) {
  uowPort = uowPort.replace(
    'import type { DomainEventEnvelope } from "@anxionos/contracts";',
    'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
  );
  write("src/domain/ports/risk-unit-of-work.ts", uowPort);
}

console.log("finalized risk src");
