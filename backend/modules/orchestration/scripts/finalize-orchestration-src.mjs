#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const src = path.join(root, "src");

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, c) => {
	fs.mkdirSync(path.dirname(p), { recursive: true });
	fs.writeFileSync(p, c);
};

function fixContractsImport(text) {
	return text
		.replace(
			/from "@anxionos\/contracts"/g,
			'from "@anxionos/contracts/orchestration"',
		)
		.replace(
			/import type \{ DomainEventEnvelope(?:,|\s)/,
			'import type { DomainEventEnvelope } from "@anxionos/contracts/events";\nimport type {',
		)
		.replace(
			/import \{ type DomainEventEnvelope, type Orchestration/,
			'import type { DomainEventEnvelope } from "@anxionos/contracts/events";\nimport { type Orchestration',
		)
		.replace(
			/import type \{ DomainEventEnvelope \} from "@anxionos\/contracts\/orchestration";/,
			'import type { DomainEventEnvelope } from "@anxionos/contracts/events";',
		)
		.replace(
			/import \{ AppError, type CheckoutTaskResult, type OrchestrationErrorCode \} from "@anxionos\/contracts\/orchestration";/,
			'import { AppError } from "@anxionos/contracts/errors";\nimport { type CheckoutTaskResult, type OrchestrationErrorCode } from "@anxionos/contracts/orchestration";',
		)
		.replace(
			/import \{ AppError, ORCHESTRATION_ERROR_STATUS_MAP, \} from "@anxionos\/contracts\/orchestration";/,
			'import { AppError } from "@anxionos/contracts/errors";\nimport { ORCHESTRATION_ERROR_STATUS_MAP } from "@anxionos/contracts/orchestration";',
		)
		.replace(
			/import \{ AppError, ORCHESTRATION_ERROR_STATUS_MAP \} from "@anxionos\/contracts\/orchestration";/,
			'import { AppError } from "@anxionos/contracts/errors";\nimport { ORCHESTRATION_ERROR_STATUS_MAP } from "@anxionos/contracts/orchestration";',
		);
}

function parseSigs(dts) {
	const out = [];
	for (const m of dts.matchAll(
		/export declare (async )?function (\w+)\(([\s\S]*?)\)(\s*:\s*[\s\S]*?);/g,
	)) {
		out.push({
			async: Boolean(m[1]),
			name: m[2],
			params: m[3].trim().replace(/,\s*$/, ""),
			ret: m[4] ?? "",
		});
	}
	return out;
}

function stripDeclareFunctions(dts) {
	return dts.replace(
		/export declare (async )?function [\s\S]*?\)\s*:\s*[\s\S]*?;\n/g,
		"",
	);
}

function stripOrphanDeclareTails(text) {
	return text
		.replace(/\n\s+\w+: [\s\S]*?\}\):[^\n]+;\n/g, "\n")
		.replace(/\n\}\>\): [^;\n]+;\n/g, "\n");
}

function typesFromDts(dts) {
	const slice = stripOrphanDeclareTails(
		stripDeclareFunctions(dts)
			.replace(/export declare class [\s\S]*?\n\}/g, "")
			.replace(/export declare const [^;]+;\n/g, "")
			.replace(/\bdeclare /g, "")
			.replace(/^\/\/# sourceMappingURL=.*$/m, ""),
	);
	return fixContractsImport(slice.trim());
}

function implFromJs(js, dts) {
	let body = js
		.replace(/^\/\/# sourceMappingURL=.*$/m, "")
		.split("\n")
		.filter((l) => !l.startsWith("import "))
		.join("\n")
		.trim();
	for (const sig of parseSigs(dts)) {
		const heads = [
			`export function ${sig.name}(${sig.params})${sig.ret}`,
			`export async function ${sig.name}(${sig.params})${sig.ret}`,
		];
		for (const head of heads) {
			const asyncPart = head.includes("async function") ? "async " : "";
			const next = body.replace(
				new RegExp(
					`export ${asyncPart}function ${sig.name}\\([\\s\\S]*?\\)\\s*\\{`,
				),
				`${head} {`,
			);
			if (next !== body) {
				body = next;
				break;
			}
		}
	}
	return body;
}

function merge(rel) {
	const dtsPath = path.join(dist, rel.replace(/\.ts$/, ".d.ts"));
	const jsPath = path.join(dist, rel.replace(/\.ts$/, ".js"));
	if (!fs.existsSync(dtsPath) || !fs.existsSync(jsPath)) return;
	const dts = read(dtsPath);
	const js = read(jsPath);
	if (!dts.includes("declare function") && !dts.includes("declare class")) {
		write(path.join(src, rel), `${typesFromDts(dts)}\n`);
		return;
	}
	if (/^export\s*\{[\s\S]*\}\s*from/m.test(js.trim())) {
		write(path.join(src, rel), `${typesFromDts(dts)}\n\n${js.trim()}\n`);
		return;
	}
	const types = typesFromDts(dts);
	const jsImports = js
		.split("\n")
		.filter((l) => l.startsWith("import "))
		.join("\n");
	const typeImports = types
		.split("\n")
		.filter((l) => l.startsWith("import "))
		.join("\n");
	const typeDecls = types
		.split("\n")
		.filter((l) => !l.startsWith("import "))
		.join("\n")
		.trim();
	const imports = [
		...new Set([...typeImports.split("\n"), ...jsImports.split("\n")]),
	]
		.filter(Boolean)
		.join("\n");
	write(
		path.join(src, rel),
		fixContractsImport(
			`${imports}\n\n${typeDecls}\n\n${implFromJs(js, dts)}\n`,
		),
	);
}

for (const dtsPath of fs.globSync("dist/**/*.d.ts")) {
	merge(path.relative(dist, dtsPath).replace(/\.d\.ts$/, ".ts"));
}

// schema from js
write(
	path.join(src, "infrastructure/persistence/schema.ts"),
	read(path.join(dist, "infrastructure/persistence/schema.js")).trim() +
		`\n\nexport type GoalRow = typeof goals.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type TaskLeaseRow = typeof taskLeases.$inferSelect;
export type RunHeartbeatRow = typeof runHeartbeats.$inferSelect;
export type GateBindingRow = typeof gateBindings.$inferSelect;
export type CommandJournalRow = typeof commandJournal.$inferSelect;
export type TaskboardMirrorRow = typeof taskboardMirror.$inferSelect;
`,
);

write(
	path.join(src, "application/errors.ts"),
	`import { AppError } from "@anxionos/contracts/errors";
import { ORCHESTRATION_ERROR_STATUS_MAP, type CheckoutTaskResult, type OrchestrationErrorCode } from "@anxionos/contracts/orchestration";

export class OrchestrationCommandError extends AppError {
\treadonly orchestrationCode: OrchestrationErrorCode;
\tconstructor(orchestrationCode: OrchestrationErrorCode, message: string, options?: { cause?: unknown }) {
\t\tconst statusCode = ORCHESTRATION_ERROR_STATUS_MAP[orchestrationCode];
\t\tconst appCode = statusCode === 404 ? "NOT_FOUND" : statusCode === 403 ? "FORBIDDEN" : statusCode === 409 ? "CONFLICT" : statusCode === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR";
\t\tsuper({ code: appCode, message, details: { code: orchestrationCode }, expose: true, cause: options?.cause });
\t\tthis.name = "OrchestrationCommandError";
\t\tthis.orchestrationCode = orchestrationCode;
\t\tObject.defineProperty(this, "statusCode", { value: statusCode });
\t}
}
export function throwOrchestrationError(code: OrchestrationErrorCode, message: string, options?: { cause?: unknown }): never {
\tthrow new OrchestrationCommandError(code, message, options);
}
export function parseCheckoutResultSnapshot(snapshot: Record<string, unknown> | null): CheckoutTaskResult {
\tif (!snapshot || typeof snapshot.task !== "object" || typeof snapshot.run !== "object") throw new Error("Invalid checkout command journal response snapshot");
\treturn { task: snapshot.task as CheckoutTaskResult["task"], run: snapshot.run as CheckoutTaskResult["run"], leaseToken: String(snapshot.leaseToken), idempotentReplay: true };
}
`,
);

write(
	path.join(src, "infrastructure/create-db.ts"),
	`import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createOrchestrationUnitOfWork } from "./orchestration-unit-of-work";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGateBindingRepository } from "./persistence/gate-binding-repository";
import { createDrizzleGoalRepository } from "./persistence/goal-repository";
import { createDrizzleRunHeartbeatRepository } from "./persistence/run-heartbeat-repository";
import { createDrizzleRunRepository } from "./persistence/run-repository";
import { createDrizzleTaskLeaseRepository } from "./persistence/task-lease-repository";
import { createDrizzleTaskRepository } from "./persistence/task-repository";
import { createDrizzleTaskboardMirrorRepository } from "./persistence/taskboard-mirror-repository";
import * as schema from "./persistence/schema";

export function createOrchestrationDb(pool: Pool) {
\tconst db = drizzle(pool, { schema });
\treturn {
\t\tdb,
\t\tschema,
\t\tgoalRepository: createDrizzleGoalRepository(db),
\t\ttaskRepository: createDrizzleTaskRepository(db),
\t\trunRepository: createDrizzleRunRepository(db),
\t\ttaskLeaseRepository: createDrizzleTaskLeaseRepository(db),
\t\tgateBindingRepository: createDrizzleGateBindingRepository(db),
\t\tcommandJournal: createDrizzleCommandJournalRepository(db),
\t\trunHeartbeatRepository: createDrizzleRunHeartbeatRepository(db),
\t\ttaskboardMirrorRepository: createDrizzleTaskboardMirrorRepository(db),
\t\tunitOfWork: createOrchestrationUnitOfWork(pool),
\t};
}
`,
);

write(
	path.join(src, "infrastructure/verify-taskboard-hmac.ts"),
	`export type { TaskboardHmacConfig } from "../domain/policies/taskboard-hmac";
export { computeTaskboardHmac, resolveTaskboardHmacConfig, verifyTaskboardHmac } from "../domain/policies/taskboard-hmac";
`,
);

// typed helpers
const patches = {
	"domain/entities/task.ts": [
		[
			"const CHECKOUT_STATUS_TRANSITIONS = {",
			"const CHECKOUT_STATUS_TRANSITIONS: Record<CheckoutStatus, CheckoutStatus[]> = {",
		],
	],
	"domain/entities/goal.ts": [
		[
			"const GOAL_STATUS_TRANSITIONS = {",
			"const GOAL_STATUS_TRANSITIONS: Record<GoalStatus, GoalStatus[]> = {",
		],
	],
	"domain/entities/run.ts": [
		[
			"const RUN_STATUS_TRANSITIONS = {",
			"const RUN_STATUS_TRANSITIONS: Record<RunStatus, RunStatus[]> = {",
		],
	],
	"application/services/validate-mirror-transition.ts": [
		[
			"const ALLOWED_MIRROR_TRANSITIONS = {",
			"const ALLOWED_MIRROR_TRANSITIONS: Record<TaskboardMirrorStatus, TaskboardMirrorStatus[]> = {",
		],
	],
	"domain/policies/taskboard-hmac.ts": [
		["env?: NodeJS.ProcessEnv", "env: NodeJS.ProcessEnv = process.env"],
		[
			"function normalizeSignature(signature)",
			"function normalizeSignature(signature: string)",
		],
	],
	"application/commands/ingest-taskboard-webhook.ts": [
		[
			"command.signature, deps.hmacConfig",
			'command.signature ?? "", deps.hmacConfig',
		],
	],
	"infrastructure/orchestration-unit-of-work.ts": [
		['from "@anxionos/eventing"', 'from "@anxionos/eventing/postgres"'],
		[
			"function createTransactionContext(client)",
			'function createTransactionContext(client: import("pg").PoolClient)',
		],
		[
			"async publishEvents(envelopes)",
			'async publishEvents(envelopes: import("@anxionos/contracts/events").DomainEventEnvelope[])',
		],
		[
			"async runInTransaction(work)",
			'async runInTransaction<T>(work: (context: import("../domain/ports/orchestration-unit-of-work").OrchestrationTransactionContext) => Promise<T>)',
		],
	],
};
for (const [rel, reps] of Object.entries(patches)) {
	let c = read(path.join(src, rel));
	for (const [a, b] of reps) c = c.replace(a, b);
	write(path.join(src, rel), c);
}

const rowFns = {
	"infrastructure/persistence/task-repository.ts": [
		["toTask", "TaskRow"],
		["toTaskLease", "TaskLeaseRow"],
	],
	"infrastructure/persistence/run-repository.ts": [["toRun", "RunRow"]],
	"infrastructure/persistence/goal-repository.ts": [["toGoal", "GoalRow"]],
	"infrastructure/persistence/gate-binding-repository.ts": [
		["toGateBinding", "GateBindingRow"],
	],
	"infrastructure/persistence/run-heartbeat-repository.ts": [
		["toHeartbeat", "RunHeartbeatRow"],
	],
	"infrastructure/persistence/task-lease-repository.ts": [
		["toLease", "TaskLeaseRow"],
	],
	"infrastructure/persistence/taskboard-mirror-repository.ts": [
		["toRecord", "TaskboardMirrorRow"],
	],
};
for (const [rel, fns] of Object.entries(rowFns)) {
	let c = read(path.join(src, rel));
	for (const [fn, type] of fns)
		c = c.replace(
			`function ${fn}(row)`,
			`function ${fn}(row: import("./schema").${type})`,
		);
	c = c.replace(
		/goalAncestry: row.goalAncestry,/g,
		"goalAncestry: row.goalAncestry as string[],",
	);
	if (rel.includes("run-repository"))
		c = c.replace(
			"inArray(runs.status, ACTIVE_RUN_STATUSES)",
			"inArray(runs.status, ACTIVE_RUN_STATUSES as (typeof runs.$inferSelect.status)[])",
		);
	if (rel.includes("command-journal"))
		c = c.replace(
			"responseSnapshot: row.responseSnapshot,",
			"responseSnapshot: row.responseSnapshot as Record<string, unknown> | null,",
		);
	write(path.join(src, rel), c);
}

// command-support — hand-maintained typed module (dist merge is fragile here)
write(
	path.join(src, "application/command-support.ts"),
	read(path.join(root, "scripts/command-support.template.ts")),
);

let cj = read(
	path.join(src, "infrastructure/persistence/command-journal-repository.ts"),
);
cj = cj.replace(
	/import \{ commandJournal, type CommandJournalRow \} from "\.\/schema";\nimport \{ eq \} from "drizzle-orm";\nimport \{ assertCommandJournalReplay, CommandJournalHashMismatchError, \} from "\.\.\/\.\.\/application\/command-support";\nimport \{ commandJournal \} from "\.\/schema";\n\n/,
	'import { eq } from "drizzle-orm";\nimport { assertCommandJournalReplay, CommandJournalHashMismatchError } from "../../application/command-support";\nimport { commandJournal, type CommandJournalRow } from "./schema";\n\n',
);
write(
	path.join(src, "infrastructure/persistence/command-journal-repository.ts"),
	cj,
);

write(
	path.join(src, "infrastructure/migrate.ts"),
	read(path.join(src, "infrastructure/migrate.ts")).replace(
		"export async function ensureOrchestrationSchema(pool)",
		'export async function ensureOrchestrationSchema(pool: import("pg").Pool)',
	),
);
write(
	path.join(src, "infrastructure/adapters/governance-traversal-adapter.ts"),
	read(
		path.join(src, "infrastructure/adapters/governance-traversal-adapter.ts"),
	)
		.replace(
			"config = {})",
			'config: { timeoutMs?: number; evaluate?: (input: import("../../domain/ports/traversal-evaluator").TraversalEvaluationInput) => Promise<{ decision: import("../../domain/ports/traversal-evaluator").TraversalDecision }> } = {}',
		)
		.replace(
			'(async () => ({ decision: "ALLOW" }))',
			'(async () => ({ decision: "ALLOW" as const }))',
		),
);
write(
	path.join(src, "infrastructure/adapters/graph-query-adapter.ts"),
	read(
		path.join(src, "infrastructure/adapters/graph-query-adapter.ts"),
	).replace(
		"config = {})",
		'config: { graphQuery?: import("../../domain/ports/graph-query").GraphQueryPort } = {}',
	),
);
write(
	path.join(src, "infrastructure/persistence/command-journal-repository.ts"),
	read(
		path.join(src, "infrastructure/persistence/command-journal-repository.ts"),
	).replace(
		"responseSnapshot: row.responseSnapshot,",
		"responseSnapshot: row.responseSnapshot as Record<string, unknown> | null,",
	),
);
write(
	path.join(src, "domain/constants.ts"),
	read(path.join(dist, "domain/constants.js")).trim() + "\n",
);

write(
	path.join(src, "domain/events/orchestration-events.ts"),
	`import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
\tORCHESTRATION_EVENT_TYPES,
\tORCHESTRATION_OWNER_DOMAIN,
\torchestrationGateDispositionRecordedV1PayloadSchema,
\torchestrationRunOrphanedV1PayloadSchema,
\torchestrationTaskCheckedOutV1PayloadSchema,
\torchestrationTaskLeaseReleasedV1PayloadSchema,
\torchestrationTaskLeaseRenewedV1PayloadSchema,
\ttype OrchestrationGateDispositionRecordedV1Payload,
\ttype OrchestrationRunOrphanedV1Payload,
\ttype OrchestrationTaskCheckedOutV1Payload,
\ttype OrchestrationTaskLeaseReleasedV1Payload,
\ttype OrchestrationTaskLeaseRenewedV1Payload,
} from "@anxionos/contracts/orchestration";

function createOrchestrationEvent(
\teventType: (typeof ORCHESTRATION_EVENT_TYPES)[keyof typeof ORCHESTRATION_EVENT_TYPES],
\tpayload: unknown,
\toccurredAt: Date = new Date(),
): DomainEventEnvelope {
\treturn domainEventEnvelopeSchema.parse({
\t\teventId: randomUUID(),
\t\tschemaVersion: "0.1.0",
\t\townerDomain: ORCHESTRATION_OWNER_DOMAIN,
\t\teventType,
\t\toccurredAt: occurredAt.toISOString(),
\t\tpayload,
\t});
}

export function createTaskCheckedOutEvent(payload: OrchestrationTaskCheckedOutV1Payload, occurredAt?: Date): DomainEventEnvelope {
\treturn createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_CHECKED_OUT, orchestrationTaskCheckedOutV1PayloadSchema.parse(payload), occurredAt);
}
export function createTaskLeaseRenewedEvent(payload: OrchestrationTaskLeaseRenewedV1Payload, occurredAt?: Date): DomainEventEnvelope {
\treturn createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RENEWED, orchestrationTaskLeaseRenewedV1PayloadSchema.parse(payload), occurredAt);
}
export function createTaskLeaseReleasedEvent(payload: OrchestrationTaskLeaseReleasedV1Payload, occurredAt?: Date): DomainEventEnvelope {
\treturn createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.TASK_LEASE_RELEASED, orchestrationTaskLeaseReleasedV1PayloadSchema.parse(payload), occurredAt);
}
export function createRunOrphanedEvent(payload: OrchestrationRunOrphanedV1Payload, occurredAt?: Date): DomainEventEnvelope {
\treturn createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.RUN_ORPHANED, orchestrationRunOrphanedV1PayloadSchema.parse(payload), occurredAt);
}
export function createGateDispositionRecordedEvent(payload: OrchestrationGateDispositionRecordedV1Payload, occurredAt?: Date): DomainEventEnvelope {
\treturn createOrchestrationEvent(ORCHESTRATION_EVENT_TYPES.GATE_DISPOSITION_RECORDED, orchestrationGateDispositionRecordedV1PayloadSchema.parse(payload), occurredAt);
}
`,
);

let syncStatus = read(
	path.join(src, "application/commands/sync-taskboard-status.ts"),
);
syncStatus = syncStatus.replace(
	/\nexport \{ TASKBOARD_POLL_INTERVAL_MS \};\n\n\/\*\*/g,
	"\n\n/**",
);
syncStatus = syncStatus.replace(
	/export async function syncTaskboardStatus\(deps\)/,
	"export async function syncTaskboardStatus(deps: SyncTaskboardStatusDeps): Promise<SyncTaskboardStatusResult>",
);
write(
	path.join(src, "application/commands/sync-taskboard-status.ts"),
	syncStatus,
);

write(
	path.join(src, "domain/ports/organization-scope.ts"),
	read(path.join(src, "domain/ports/organization-scope.ts"))
		.replace(
			/export declare class OrganizationScopeDeniedError[\s\S]*?\n\}\n\n/,
			"",
		)
		.replace(
			'constructor(message = "Organization scope denied", options)',
			'constructor(message = "Organization scope denied", options?: ErrorOptions)',
		),
);
write(
	path.join(src, "domain/ports/principal-lookup.ts"),
	read(path.join(src, "domain/ports/principal-lookup.ts"))
		.replace(
			/export declare class PrincipalLookupUnavailableError[\s\S]*?\n\}\n\n/,
			"",
		)
		.replace(
			'constructor(message = "Principal lookup unavailable", options)',
			'constructor(message = "Principal lookup unavailable", options?: ErrorOptions)',
		)
		.replace(
			"assertPrincipalActive(principalId, options)",
			"assertPrincipalActive(principalId: string, options: { organizationId: string })",
		),
);

console.log("finalized orchestration src");
