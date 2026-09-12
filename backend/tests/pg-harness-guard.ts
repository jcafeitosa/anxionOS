/**
 * ANX-487 — shared safety guard for the destructive PostgreSQL integration
 * harnesses.
 *
 * Every `withXxxPgHarness` in `backend/tests/**` issues `TRUNCATE` against the
 * domain tables of `DATABASE_URL`. The previous per-module check
 * (`process.env.RUN_PG_INTEGRATION_TESTS === "true" && DATABASE_URL`) had two
 * confirmed defects:
 *
 *   1. it accepted ANY target — a real or remote database included — and
 *      truncated it;
 *   2. any other value (`1`, `TRUE`, `yes`) produced a silent early `return`
 *      that the runner reported as PASS, so a gate could declare "real
 *      PostgreSQL" without running a single query.
 *
 * This module is the single source of truth for that decision. It is imported
 * by the 15 module `test-support.ts` files, which no longer keep a local copy.
 */
import {
	isScratchDatabaseName,
	PROTECTED_DATABASES,
} from "../scripts/protected-databases";

/** Environment slice the guard reads, injectable for tests. */
export interface PgHarnessEnv {
	RUN_PG_INTEGRATION_TESTS?: string | undefined;
	DATABASE_URL?: string | undefined;
	ALLOW_DESTRUCTIVE_TEST_DB?: string | undefined;
}

/** Hosts that count as loopback. A destructive harness never leaves the box. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/** Tokens that enable the destructive harness (case-insensitive). */
const ENABLING_TOKENS = new Set(["true", "1", "yes", "on"]);

/** Tokens that disable it (case-insensitive); empty string counts as disabled. */
const DISABLING_TOKENS = new Set(["false", "0", "no", "off", ""]);

/** The variable that is the only legitimate way to release the host/db checks. */
export const DESTRUCTIVE_DB_OVERRIDE_ENV = "ALLOW_DESTRUCTIVE_TEST_DB";

/** Reader used by the harnesses; mirrors the old local `getDatabaseUrl`. */
export function getDatabaseUrl(
	env: PgHarnessEnv = process.env,
): string | undefined {
	const raw = env.DATABASE_URL?.trim();
	return raw ? raw : undefined;
}

/**
 * Resolves `RUN_PG_INTEGRATION_TESTS`.
 *
 * Decisions (documented per ANX-487):
 *   - **absent** → `false`. `bun test` without a database must keep working, so
 *     an unset variable is a normal skip, not an error.
 *   - **recognized on** (`true`/`1`/`yes`/`on`, case-insensitive) → `true`.
 *     Accepting the common truthy spellings removes the old false-green trap
 *     where `=1` silently skipped and was reported as PASS.
 *   - **recognized off** (`false`/`0`/`no`/`off`/empty, case-insensitive) →
 *     `false`.
 *   - **anything else** → throw. A present-but-unrecognized value is an
 *     operator error; it must fail loudly instead of becoming a silent PASS.
 */
export function readRunPgIntegrationTestsFlag(
	env: PgHarnessEnv = process.env,
): boolean {
	const raw = env.RUN_PG_INTEGRATION_TESTS;
	if (raw === undefined) {
		return false;
	}
	const normalized = raw.trim().toLowerCase();
	if (ENABLING_TOKENS.has(normalized)) {
		return true;
	}
	if (DISABLING_TOKENS.has(normalized)) {
		return false;
	}
	throw new Error(
		`RUN_PG_INTEGRATION_TESTS has unrecognized value ${JSON.stringify(raw)} (ANX-487). ` +
			"Recognized: true/1/yes/on = enable; false/0/no/off/empty = disable; " +
			"absent = skip the destructive PostgreSQL harness. " +
			"A silent skip that the runner counts as PASS is forbidden.",
	);
}

/** True only for an explicit opt-in token, never for an absent variable. */
function isDestructiveDbOverrideEnabled(env: PgHarnessEnv): boolean {
	const raw = env[DESTRUCTIVE_DB_OVERRIDE_ENV];
	return raw !== undefined && ENABLING_TOKENS.has(raw.trim().toLowerCase());
}

/**
 * Validates that `DATABASE_URL` is a safe target for a `TRUNCATE` harness.
 *
 * Requires loopback host, a non-protected database and a documented scratch
 * name (see `scripts/protected-databases.ts`). Throws with an explicit message
 * — never returns a silent "do not run" — so a gate cannot turn an unsafe
 * target into a green suite.
 */
export function assertDestructivePgTarget(
	env: PgHarnessEnv = process.env,
): void {
	const rawUrl = getDatabaseUrl(env);
	if (!rawUrl) {
		throw new Error(
			"DATABASE_URL is required when RUN_PG_INTEGRATION_TESTS is enabled (ANX-487). " +
				"Refusing to guess a target for the destructive TRUNCATE harness.",
		);
	}

	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw new Error(
			`DATABASE_URL is not a valid URL (ANX-487): ${JSON.stringify(rawUrl)}. ` +
				"Refusing to run the destructive TRUNCATE harness.",
		);
	}
	if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
		throw new Error(
			`DATABASE_URL must use the postgres:// or postgresql:// protocol (ANX-487), got ${JSON.stringify(parsed.protocol)}.`,
		);
	}

	const host = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
	const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
	if (!database) {
		throw new Error(
			"DATABASE_URL does not name a database (ANX-487). Refusing to run the destructive TRUNCATE harness.",
		);
	}

	if (isDestructiveDbOverrideEnabled(env)) {
		return;
	}

	if (!LOOPBACK_HOSTS.has(host)) {
		throw new Error(
			`refusing to TRUNCATE database "${database}" on non-loopback host "${host}" (ANX-487). ` +
				"The PostgreSQL integration harness is destructive (TRUNCATE ... CASCADE), so it only runs " +
				"against localhost/127.0.0.1/::1. To accept the risk on purpose, set " +
				`${DESTRUCTIVE_DB_OVERRIDE_ENV}=true.`,
		);
	}
	if (PROTECTED_DATABASES.has(database)) {
		throw new Error(
			`refusing to TRUNCATE protected database "${database}" (ANX-487). ` +
				"It is reserved for dev/shared use and holds real data. Point DATABASE_URL at a scratch " +
				`database (e.g. anxionos_oracle) or set ${DESTRUCTIVE_DB_OVERRIDE_ENV}=true to accept the risk.`,
		);
	}
	if (!isScratchDatabaseName(database)) {
		throw new Error(
			`refusing to TRUNCATE database "${database}": it does not match a documented test/scratch name (ANX-487). ` +
				"Accepted names are anxionos_<scratch>, *_test, *_oracle, *_oracle_neg, *_g<d>r*, *_wt, " +
				`*_zero or *_scratch on loopback. Set ${DESTRUCTIVE_DB_OVERRIDE_ENV}=true to accept the risk.`,
		);
	}
}

/**
 * Decision point for the module harnesses: run the destructive PostgreSQL
 * integration tests?
 *
 * Returns `false` only when the variable is absent or explicitly disabled.
 * Throws when it is enabled but the target is missing/invalid/unsafe, or when
 * the variable carries an unrecognized value.
 */
export function shouldRunPgIntegrationTests(
	env: PgHarnessEnv = process.env,
): boolean {
	if (!readRunPgIntegrationTestsFlag(env)) {
		return false;
	}
	assertDestructivePgTarget(env);
	return true;
}

/** Minimal query surface the TRUNCATE helper needs (satisfied by `pg.Pool`). */
export interface TruncateQueryable {
	query(sql: string): Promise<unknown>;
}

/**
 * The only sanctioned way to execute a domain `TRUNCATE` from the test
 * harnesses. It re-evaluates the full guard immediately before the statement,
 * so a harness cannot reach the destructive path by calling `pool.query`
 * directly with a prepared SQL constant.
 */
export async function truncateDomainTables(
	pool: TruncateQueryable,
	sql: string,
	env: PgHarnessEnv = process.env,
): Promise<void> {
	if (!readRunPgIntegrationTestsFlag(env)) {
		throw new Error(
			"refusing to TRUNCATE: RUN_PG_INTEGRATION_TESTS is not enabled (ANX-487). " +
				"Use truncateDomainTables only inside a guarded PostgreSQL harness.",
		);
	}
	assertDestructivePgTarget(env);
	await pool.query(sql);
}
