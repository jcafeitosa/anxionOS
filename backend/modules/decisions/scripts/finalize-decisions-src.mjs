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
  decisionsCommandResultSchema,
  type DecisionsCommandResult,
  type DecisionsErrorCode,
} from "@anxionos/contracts/decisions";

export class DecisionsCommandError extends Error {
  readonly code: DecisionsErrorCode;

  constructor(code: DecisionsErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "DecisionsCommandError";
  }
}

export function throwDecisionsError(code: DecisionsErrorCode, message: string): never {
  throw new DecisionsCommandError(code, message);
}

export function parseCommandResultSnapshot(snapshot: Record<string, unknown>): DecisionsCommandResult {
  return decisionsCommandResultSchema.parse({
    aggregateId: snapshot.aggregateId,
    revision: snapshot.revision,
    idempotentReplay: snapshot.idempotentReplay,
    decisionId: snapshot.decisionId,
    proposalId: snapshot.proposalId,
    intentId: snapshot.intentId,
  });
}
`);

write("src/application/command-support.ts", `import type { DecisionsCommandResult } from "@anxionos/contracts/decisions";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot } from "./errors";

export async function loadIdempotentCommandResult(
  commandJournal: CommandJournalRepository,
  commandId: string,
): Promise<DecisionsCommandResult | null> {
  const existing = await commandJournal.findByCommandId(commandId);
  if (!existing) return null;
  const parsed = parseCommandResultSnapshot(existing.responseSnapshot);
  return { ...parsed, idempotentReplay: true };
}

export function toCommandResultSnapshot(result: DecisionsCommandResult): Record<string, unknown> {
  return {
    aggregateId: result.aggregateId,
    revision: result.revision,
    idempotentReplay: result.idempotentReplay ?? false,
    decisionId: result.decisionId,
    proposalId: result.proposalId,
    intentId: result.intentId,
  };
}
`);

write("src/domain/events/decisions-events.ts", `import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
  DECISIONS_EVENT_TYPES,
  DECISIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/decisions";

export function createProposalCreatedEvent(input: {
  decisionId: string;
  proposalId: string;
  organizationId: string;
  grantId: string;
  expectedAuthorityEpoch: number;
  proposalKind: string;
  correlationId: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.PROPOSAL_CREATED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createAuthorityCheckedEvent(input: {
  decisionId: string;
  organizationId: string;
  grantId: string;
  authorityEpoch: number;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.AUTHORITY_CHECKED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}

export function createIntentSubmittedEvent(input: {
  decisionId: string;
  intentId: string;
  organizationId: string;
  intentHash: string;
  instrumentId: string;
  side: string;
  quantity: string;
  price: string;
  executionMode: string;
}): DomainEventEnvelope {
  return {
    eventId: randomUUID(),
    eventType: DECISIONS_EVENT_TYPES.INTENT_SUBMITTED,
    schemaVersion: "0.1.0",
    ownerDomain: DECISIONS_OWNER_DOMAIN,
    occurredAt: new Date().toISOString(),
    payload: input,
  };
}
`);

write("src/infrastructure/decisions-unit-of-work.ts", `import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing/postgres";
import type { Pool, PoolClient } from "pg";
import type {
  DecisionsTransactionContext,
  DecisionsUnitOfWork,
} from "../domain/ports/decisions-unit-of-work";
import { createPgCommandJournalRepository } from "./persistence/command-journal-repository";
import {
  createPgDecisionRepository,
  createPgProposalRepository,
  createPgTradeIntentRepository,
} from "./persistence/repositories";

function createTransactionContext(client: PoolClient): DecisionsTransactionContext {
  return {
    commandJournal: createPgCommandJournalRepository(client),
    decisions: createPgDecisionRepository(client),
    proposals: createPgProposalRepository(client),
    tradeIntents: createPgTradeIntentRepository(client),
    async publishEvents(envelopes: DomainEventEnvelope[]) {
      for (const envelope of envelopes) {
        await appendJournal(client, envelope);
        await enqueueOutbox(client, envelope);
      }
    },
  };
}

export function createDecisionsUnitOfWork(pool: Pool): DecisionsUnitOfWork {
  return {
    async runInTransaction<T>(work: (ctx: DecisionsTransactionContext) => Promise<T>) {
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

export async function ensureDecisionsSchema(pool: Pool): Promise<void> {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
}

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://anxionos:anxionos@localhost:5432/anxionos";

async function main(): Promise<void> {
  const { Pool: PgPool } = await import("pg");
  const pool = new PgPool({ connectionString: databaseUrl });
  await ensureDecisionsSchema(pool);
  await pool.end();
  console.log("decisions migrations applied");
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
`);

for (const [rel, fn, depsType, cmdType] of [
  ["src/application/commands/propose-decision.ts", "proposeDecision", "ProposeDecisionDeps", "ProposeDecisionCommand"],
  ["src/application/commands/check-authority.ts", "checkAuthority", "CheckAuthorityDeps", "CheckAuthorityCommand"],
  ["src/application/commands/submit-intent.ts", "submitIntent", "SubmitIntentDeps", "SubmitIntentCommand"],
]) {
  let c = read(rel);
  if (!c.includes(`${fn}(deps: ${depsType}`)) {
    c = c.replace(
      `export async function ${fn}(deps, input)`,
      `export async function ${fn}(deps: ${depsType}, input: ${cmdType}): Promise<DecisionsCommandResult>`,
    );
  }
  write(rel, c);
}

write(
  "src/infrastructure/persistence/repositories.ts",
  read("dist/infrastructure/persistence/repositories.js")
    .replace(
      /^import \{ DecisionsCommandError \}/,
      `import type { PoolClient } from "pg";
import { DecisionsCommandError } from "../../application/errors";
import type {
  DecisionRecord,
  DecisionRepository,
  ProposalRecord,
  ProposalRepository,
  TradeIntentRecord,
  TradeIntentRepository,
} from "../../domain/ports/decisions-unit-of-work";

function isPgUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";
}`,
    )
    .replace("function mapDecision(row) {", "function mapDecision(row: Record<string, unknown>): DecisionRecord {")
    .replace("function mapProposal(row) {", "function mapProposal(row: Record<string, unknown>): ProposalRecord {")
    .replace("function mapTradeIntent(row) {", "function mapTradeIntent(row: Record<string, unknown>): TradeIntentRecord {")
    .replace(/id: row\.id,/g, "id: String(row.id),")
    .replace(/organizationId: row\.organization_id,/g, "organizationId: String(row.organization_id),")
    .replace(/grantId: row\.grant_id,/g, "grantId: String(row.grant_id),")
    .replace(/expectedAuthorityEpoch: row\.expected_authority_epoch,/g, "expectedAuthorityEpoch: Number(row.expected_authority_epoch),")
    .replace(/correlationId: row\.correlation_id,/g, "correlationId: String(row.correlation_id),")
    .replace(/status: row\.status,/g, "status: String(row.status),")
    .replace(/revision: row\.revision,/g, "revision: Number(row.revision),")
    .replace(/decisionId: row\.decision_id,/g, "decisionId: String(row.decision_id),")
    .replace(/proposalKind: row\.proposal_kind,/g, "proposalKind: String(row.proposal_kind),")
    .replace(/intentHash: row\.intent_hash,/g, "intentHash: String(row.intent_hash),")
    .replace(/instrumentId: row\.instrument_id,/g, "instrumentId: String(row.instrument_id),")
    .replace(/side: row\.side,/g, "side: String(row.side),")
    .replace(/executionMode: row\.execution_mode,/g, "executionMode: String(row.execution_mode),")
    .replace(
      "export function createPgDecisionRepository(client) {",
      "export function createPgDecisionRepository(client: PoolClient): DecisionRepository {",
    )
    .replace(
      "export function createPgProposalRepository(client) {",
      "export function createPgProposalRepository(client: PoolClient): ProposalRepository {",
    )
    .replace(
      "export function createPgTradeIntentRepository(client) {",
      "export function createPgTradeIntentRepository(client: PoolClient): TradeIntentRepository {",
    )
    .replace(/async save\(record\)/g, "async save(record: DecisionRecord | ProposalRecord | TradeIntentRecord)")
    .replace(
      /catch \(error\) \{\s*if \(error\.code === "23505"\)/,
      "catch (error: unknown) {\n                if (isPgUniqueViolation(error))",
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

console.log("finalized decisions src");
