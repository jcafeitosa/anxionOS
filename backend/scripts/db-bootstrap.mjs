#!/usr/bin/env bun
/**
 * ANX-463 — canonical bootstrap for a brand-new PostgreSQL database.
 *
 * Applies, in order:
 *   1. ADR0004 storage extensions (timescaledb, vector);
 *   2. RLS roles + grants (anxion_app / anxion_service / anxion_migrator);
 *   3. eventing schema (domain_journal + outbox);
 *   4. every module's own versioned migration (`ensureXSchema`);
 *   5. Better Auth tables used by apps/api.
 *
 * The per-module order mirrors apps/api/src/index.ts plus the modules that only
 * their own worker/app boots (accounting, audit, billing, capital, connections,
 * graph, knowledge, market-data, orchestration) — a fresh instance must be able
 * to run all 23 baseline modules from zero.
 *
 * Usage:
 *   bun run scripts/db-bootstrap.mjs                 # migrate DATABASE_URL
 *   bun run scripts/db-bootstrap.mjs --json          # machine-readable result
 *   bun run scripts/db-bootstrap.mjs --print-plan    # list steps, no DB access
 *
 * Requires DATABASE_URL (a role allowed to CREATE SCHEMA / GRANT on that DB).
 * Idempotent: safe to re-run against an already provisioned database.
 */
import { parseArgs } from "node:util";
import { ensureAccountingSchema } from "@anxionos/accounting";
import { ensureAgentsSchema } from "@anxionos/agents";
import { ensureAuditSchema } from "@anxionos/audit";
import { ensureBillingSchema } from "@anxionos/billing";
import { ensureCapitalSchema } from "@anxionos/capital";
import { ensureConnectionsSchema } from "@anxionos/connections";
import { provisionDatabaseRoles } from "@anxionos/database";
import { ensureDecisionsSchema } from "@anxionos/decisions";
import { ensureEvaluationSchema } from "@anxionos/evaluation";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureExecutionSchema } from "@anxionos/execution";
import { ensureGovernanceSchema } from "@anxionos/governance";
import { ensureGraphSchema } from "@anxionos/graph";
import { ensureIdentitySchema } from "@anxionos/identity";
import { ensureKnowledgeSchema } from "@anxionos/knowledge";
import { ensureMarketDataSchema } from "@anxionos/market-data";
import { ensureOperationsSchema } from "@anxionos/operations";
import { ensureOrchestrationSchema } from "@anxionos/orchestration";
import { ensureOrganizationsSchema } from "@anxionos/organizations";
import { ensurePartnersSchema } from "@anxionos/partners";
import { ensurePerformanceSchema } from "@anxionos/performance";
import { ensurePortfoliosSchema } from "@anxionos/portfolios";
import { ensureRiskSchema } from "@anxionos/risk";
import { ensureSimulationSchema } from "@anxionos/simulation";
import { ensureStrategiesSchema } from "@anxionos/strategies";
import { ensureBetterAuthSchema } from "../apps/api/src/auth/ensure-better-auth-schema.ts";

/** Single source of truth for "what a fresh database needs". */
export const BOOTSTRAP_STEPS = [
	["extensions", ensureStorageExtensions],
	["roles+grants", provisionDatabaseRoles],
	["eventing", ensureEventingSchema],
	["accounting", ensureAccountingSchema],
	["agents", ensureAgentsSchema],
	["audit", ensureAuditSchema],
	["billing", ensureBillingSchema],
	["capital", ensureCapitalSchema],
	["connections", ensureConnectionsSchema],
	["decisions", ensureDecisionsSchema],
	["evaluation", ensureEvaluationSchema],
	["execution", ensureExecutionSchema],
	["governance", ensureGovernanceSchema],
	["graph", ensureGraphSchema],
	["identity", ensureIdentitySchema],
	["knowledge", ensureKnowledgeSchema],
	["market-data", ensureMarketDataSchema],
	["operations", ensureOperationsSchema],
	["orchestration", ensureOrchestrationSchema],
	["organizations", ensureOrganizationsSchema],
	["partners", ensurePartnersSchema],
	["performance", ensurePerformanceSchema],
	["portfolios", ensurePortfoliosSchema],
	["risk", ensureRiskSchema],
	["simulation", ensureSimulationSchema],
	["strategies", ensureStrategiesSchema],
	["better-auth", ensureBetterAuthSchema],
];

export function readDatabaseUrl() {
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required to bootstrap a database");
	}
	return databaseUrl;
}

function parseCli(argv) {
	return parseArgs({
		args: argv,
		options: {
			json: { type: "boolean", default: false },
			"print-plan": { type: "boolean", default: false },
			"allow-gaps": { type: "boolean", default: false },
			"role-password": { type: "string" },
		},
		allowPositionals: false,
	}).values;
}

/**
 * ADR0004 storage extensions. `timescaledb` is required by the performance
 * hypertable migration; `vector` is the ADR0004 embedding store. Both ship in
 * the deployment image (`deploy/docker/docker-compose.yml`); installing them
 * here makes a bare database self-contained instead of relying on template
 * inheritance.
 */
async function ensureStorageExtensions(pool) {
	await pool.query("CREATE EXTENSION IF NOT EXISTS timescaledb");
	await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
}

/**
 * Drizzle migrator signature for "this module has no versioned migrations":
 * its `ensureXSchema` points at a `migrations/` folder that does not exist.
 */
const MISSING_MIGRATIONS_PATTERN = /can't find meta\/_journal\.json/i;

export async function bootstrapDatabase(databaseUrl, options = {}) {
	const pool = createPgPool(databaseUrl);
	const applied = [];
	const gaps = [];
	try {
		for (const [name, ensure] of BOOTSTRAP_STEPS) {
			try {
				await ensure(pool, options.roleOptions);
				applied.push(name);
				if (!options.quiet) {
					console.error(`[db-bootstrap] ${name} ok`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				if (!MISSING_MIGRATIONS_PATTERN.test(message)) {
					throw error;
				}
				// Known ANX-463 residual: the module ships repositories but no
				// versioned migration, so a fresh database cannot create its tables.
				gaps.push({ name, reason: message });
				if (!options.quiet) {
					console.error(
						`[db-bootstrap] ${name} GAP: no versioned migrations (${message})`,
					);
				}
			}
		}
	} finally {
		await pool.end();
	}
	return { applied, gaps };
}

async function main() {
	const cli = parseCli(process.argv.slice(2));
	if (cli["print-plan"]) {
		const plan = BOOTSTRAP_STEPS.map(([name]) => name);
		console.log(JSON.stringify({ steps: plan }, null, 2));
		return;
	}

	const databaseUrl = readDatabaseUrl();
	const rolePassword =
		cli["role-password"] ?? process.env.DATABASE_ROLE_PASSWORD;
	try {
		const { applied, gaps } = await bootstrapDatabase(databaseUrl, {
			quiet: cli.json,
			roleOptions: rolePassword ? { password: rolePassword } : {},
		});
		if (cli.json) {
			console.log(
				JSON.stringify({
					ok: gaps.length === 0,
					steps: applied.length,
					applied,
					gaps,
				}),
			);
		} else {
			console.error(
				`[db-bootstrap] fresh database ready (${applied.length} steps, ${gaps.length} gaps)`,
			);
			for (const gap of gaps) {
				console.error(`[db-bootstrap] GAP ${gap.name}: ${gap.reason}`);
			}
		}
		if (gaps.length > 0 && !cli["allow-gaps"]) {
			process.exitCode = 1;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (cli.json) {
			console.log(JSON.stringify({ ok: false, error: message }));
		} else {
			console.error(`[db-bootstrap] failed: ${message}`);
		}
		process.exitCode = 1;
	}
}

if (import.meta.main) {
	await main();
}
