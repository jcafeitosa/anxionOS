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
 * Round 2 (revalidation G2/G4) closed a third one: validating only
 * `new URL(DATABASE_URL).hostname` was not the target the driver uses, because
 * `pg` → `pg-connection-string` honours `host`/`port`/`user`/`password` query
 * parameters and the `PG*` environment fallbacks. The guard now validates the
 * target the driver resolves (see {@link resolveEffectivePgTarget}).
 *
 * Round 3 extended coverage to the two harnesses that never called this module
 * (`tests/graph/product-graph-inbox.integration.test.ts` and the
 * `tests/p06-integration/paper-flow-*.test.ts` trio), added
 * {@link runGuardedSql} for the parameterized `DELETE` of the inbox reset, and
 * fixed the credential redaction for whitespace, an `@` inside the password and
 * the `//`-less URL form.
 *
 * This module is the single source of truth for that decision. It is imported
 * by the 15 module `test-support.ts` files, which no longer keep a local copy.
 */
import { createRequire } from "node:module";
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

/** Marker used by {@link redactDatabaseUrl}; never a real credential. */
const REDACTION_MARKER = "***REDACTED***";

/** Query parameters that may carry a secret (`?password=`, `?sslkey=`, ...). */
const SECRET_QUERY_PARAM_PATTERN =
	/([?&][^=&#\s]*(?:pass|pwd|secret|token|key)[^=&#\s]*=)[^&#\s]*/gi;

/** Reader used by the harnesses; mirrors the old local `getDatabaseUrl`. */
export function getDatabaseUrl(
	env: PgHarnessEnv = process.env,
): string | undefined {
	const raw = env.DATABASE_URL?.trim();
	return raw ? raw : undefined;
}

/**
 * Removes the userinfo (`user[:password]@`) from a URL **or** from a bare
 * fragment such as the effective `database`/`host` the driver resolves for a
 * malformed `DATABASE_URL`.
 *
 * ANX-487 round 3 — the previous regex `/(\/\/)[^@\s]*@/g` failed three ways:
 *   1. it excluded whitespace, so a password with a space/tab/newline survived
 *      (`postgres://alice:p ss@host` was printed verbatim);
 *   2. it stopped at the first `@`, so `postgres://alice:p@ss@host` leaked the
 *      `ss` tail despite the "greedy to the last @" comment;
 *   3. it required `//`, so the `//`-less form `postgres:alice:S3cr3t@host`
 *      (whose userinfo the driver folds into `target.database`) leaked in the
 *      refusal message.
 *
 * It now drops everything up to the **last** `@` and keeps only the scheme
 * prefix (`postgres://`) so the message stays readable. Over-redacting a value
 * that merely contains an `@` is deliberate: no credential can survive.
 */
export function redactCredentialFragment(value: string): string {
	const lastAt = value.lastIndexOf("@");
	if (lastAt < 0) {
		return value;
	}
	const scheme = /^[a-z][a-z0-9+.-]*:\/\//i.exec(value)?.[0] ?? "";
	return `${scheme}${REDACTION_MARKER}@${value.slice(lastAt + 1)}`;
}

/**
 * Removes credentials before a URL is embedded in an error message.
 *
 * ANX-487 round 2 (finding 3): the invalid-URL error used to interpolate
 * `JSON.stringify(rawUrl)` verbatim, so a malformed URL printed the whole
 * password. This helper drops the userinfo — even for strings `URL` cannot
 * parse — and the value of any secret-looking query parameter.
 */
export function redactDatabaseUrl(rawUrl: string): string {
	return redactCredentialFragment(rawUrl).replace(
		SECRET_QUERY_PARAM_PATTERN,
		`$1${REDACTION_MARKER}`,
	);
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
 * The connection target the `pg` driver will really use, in the same shape the
 * driver resolves it: query parameters and `PG*` fallbacks already applied.
 */
export interface ResolvedPgTarget {
	host: string;
	port: number;
	database: string;
	user: string;
	password: string;
}

/**
 * Module the harnesses use to build their pool. `createPgPool(databaseUrl)` in
 * `@anxionos/eventing/postgres` is `new Pool({ connectionString: databaseUrl })`,
 * and that package owns the `pg` dependency. `backend/tests/` cannot import
 * `pg` (or `pg-connection-string`) as a bare specifier — `pg` is not a
 * dependency of `backend/` and bun's isolated linker does not expose transitive
 * packages — so the driver is resolved through the exact module the harnesses
 * import. This keeps `pg-connection-string` as the source of truth instead of
 * reimplementing (and drifting from) its precedence rules.
 */
const PG_DRIVER_RESOLUTION_ANCHOR = "@anxionos/eventing/postgres";

interface PgConnectionParametersLike {
	readonly host?: string | null;
	readonly port: number;
	readonly database?: string | null;
	readonly user?: string | null;
	readonly password?: string | null;
}

interface PgClientLike {
	readonly connectionParameters: PgConnectionParametersLike;
}

interface PgDriverLike {
	readonly Client: new (config: { connectionString: string }) => PgClientLike;
}

let cachedPgDriver: PgDriverLike | undefined;

function loadPgDriver(): PgDriverLike {
	if (cachedPgDriver) {
		return cachedPgDriver;
	}
	let anchor: string;
	try {
		anchor = import.meta.resolve(PG_DRIVER_RESOLUTION_ANCHOR);
	} catch {
		throw new Error(
			`cannot resolve "${PG_DRIVER_RESOLUTION_ANCHOR}" to reach the pg driver (ANX-487). ` +
				"The guard must validate the same driver the harnesses connect with.",
		);
	}
	cachedPgDriver = createRequire(anchor)("pg") as PgDriverLike;
	return cachedPgDriver;
}

/**
 * Resolves the effective target with `pg`'s own `ConnectionParameters`, which
 * is what `new Pool({ connectionString })` builds and what ultimately decides
 * `host`/`port`/`database`/`user`/`password`. No socket is opened.
 *
 * This closes the round-2 bypass: for
 * `postgres://user:pw@localhost:5432/scratch?host=203.0.113.9` the returned
 * `host` is `203.0.113.9`, not `localhost`. It also covers the parameters the
 * driver accepts for the target — `host`, `port`, `user`, `password` override
 * the URL; `hostaddr`, `dbname` and `database` do not (verified against
 * `pg-connection-string@2.14.0` / `pg@8.23.0`) — plus the `PGHOST`/`PGPORT`/
 * `PGDATABASE`/`PGUSER`/`PGPASSWORD` fallbacks used when the URL omits them.
 */
export function resolveEffectivePgTarget(rawUrl: string): ResolvedPgTarget {
	let client: PgClientLike;
	try {
		const { Client } = loadPgDriver();
		client = new Client({ connectionString: rawUrl });
	} catch {
		// The driver error may embed the raw URL; never forward it verbatim.
		throw new Error(
			`DATABASE_URL could not be resolved by the pg driver (ANX-487): ${redactDatabaseUrl(rawUrl)}. ` +
				"Refusing to run the destructive TRUNCATE harness.",
		);
	}
	const parameters = client.connectionParameters;
	return {
		host: parameters.host ?? "",
		port: parameters.port,
		database: parameters.database ?? "",
		user: parameters.user ?? "",
		password: parameters.password ?? "",
	};
}

/** IPv6 literals arrive bracketed from the driver; compare them unbracketed. */
function normalizeHost(host: string): string {
	return host.replace(/^\[|\]$/g, "").toLowerCase();
}

/**
 * Validates that `DATABASE_URL` is a safe target for a `TRUNCATE` harness and
 * returns the validated target.
 *
 * Requires loopback host, a non-protected database and a documented scratch
 * name (see `scripts/protected-databases.ts`) — all evaluated on the driver's
 * effective target, not on the URL authority. Throws with an explicit message
 * — never returns a silent "do not run" — so a gate cannot turn an unsafe
 * target into a green suite.
 */
export function assertDestructivePgTarget(
	env: PgHarnessEnv = process.env,
): ResolvedPgTarget {
	const rawUrl = getDatabaseUrl(env);
	if (!rawUrl) {
		throw new Error(
			"DATABASE_URL is required when RUN_PG_INTEGRATION_TESTS is enabled (ANX-487). " +
				"Refusing to guess a target for the destructive TRUNCATE harness.",
		);
	}

	// Shape/protocol validation first, so a malformed or non-postgres URL gets
	// an explicit error instead of a confusing driver fallback (a relative
	// string resolves against the driver's internal `postgres://base`).
	let parsed: URL;
	try {
		parsed = new URL(rawUrl);
	} catch {
		throw new Error(
			`DATABASE_URL is not a valid URL (ANX-487): ${redactDatabaseUrl(rawUrl)}. ` +
				"Refusing to run the destructive TRUNCATE harness.",
		);
	}
	if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
		throw new Error(
			`DATABASE_URL must use the postgres:// or postgresql:// protocol (ANX-487), got ${JSON.stringify(parsed.protocol)}.`,
		);
	}

	// Ground truth: the authority above is NOT the target. Query parameters and
	// `PG*` fallbacks can move the connection elsewhere.
	const target = resolveEffectivePgTarget(rawUrl);
	const host = normalizeHost(target.host);
	const database = target.database;
	// A malformed URL (`postgres:alice:S3cr3t@host`) makes the driver fold the
	// userinfo into `database`/`host`; refusal messages must never print them
	// raw (ANX-487 round 3).
	const safeHost = redactCredentialFragment(host);
	const safeDatabase = redactCredentialFragment(database);

	if (isDestructiveDbOverrideEnabled(env)) {
		return target;
	}

	if (!LOOPBACK_HOSTS.has(host)) {
		throw new Error(
			`refusing to TRUNCATE database "${safeDatabase}" on non-loopback host "${safeHost}" (ANX-487). ` +
				"The PostgreSQL integration harness is destructive (TRUNCATE ... CASCADE), so it only runs " +
				"against localhost/127.0.0.1/::1. To accept the risk on purpose, set " +
				`${DESTRUCTIVE_DB_OVERRIDE_ENV}=true.`,
		);
	}
	if (
		!Number.isInteger(target.port) ||
		target.port < 1 ||
		target.port > 65535
	) {
		throw new Error(
			`refusing to TRUNCATE database "${safeDatabase}": DATABASE_URL resolves to invalid port ${String(target.port)} (ANX-487). ` +
				`Fix the port or the ?port= parameter (the pg driver uses it to override the authority).`,
		);
	}
	// Case-insensitive on purpose (ANX-487 round 2, finding 4): the scratch
	// pattern is `/i`, so an uppercase spelling must not slip past the protected
	// list. PostgreSQL matches names case-sensitively, which is exactly why the
	// check must be conservative.
	if (PROTECTED_DATABASES.has(database.toLowerCase())) {
		throw new Error(
			`refusing to TRUNCATE protected database "${safeDatabase}" (ANX-487). ` +
				"It is reserved for dev/shared use and holds real data. Point DATABASE_URL at a scratch " +
				`database (e.g. anxionos_oracle) or set ${DESTRUCTIVE_DB_OVERRIDE_ENV}=true to accept the risk.`,
		);
	}
	if (!isScratchDatabaseName(database)) {
		throw new Error(
			`refusing to TRUNCATE database "${safeDatabase}": it does not match a documented test/scratch name (ANX-487). ` +
				"Accepted names are anxionos_<scratch>, *_test, *_oracle, *_oracle_neg, *_g<d>r*, *_wt, " +
				`*_zero or *_scratch on loopback. Set ${DESTRUCTIVE_DB_OVERRIDE_ENV}=true to accept the risk.`,
		);
	}
	return target;
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

/** Query surface for the guarded cleanup helpers (parameterized statements). */
export interface GuardedQueryable {
	query(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * A single `TRUNCATE` statement, with at most one trailing `;`. Anything else
 * — `DROP DATABASE ...`, `DELETE ...`, or a second statement smuggled after a
 * `;` — is refused (ANX-487 round 2, finding 5).
 */
const TRUNCATE_STATEMENT_PATTERN = /^\s*TRUNCATE\b[^;]*(?:;\s*)?$/i;

/**
 * A single fixture-cleanup statement, with at most one trailing `;`. `DELETE`
 * is allowed here because the product-graph inbox reset (ANX-277) removes only
 * its own consumer rows; DDL (`DROP`, `ALTER`) and multi-statement payloads
 * stay refused even on an approved target (ANX-487 round 2, finding 5).
 */
const GUARDED_CLEANUP_STATEMENT_PATTERN =
	/^\s*(?:TRUNCATE|DELETE)\b[^;]*(?:;\s*)?$/i;

/**
 * Shared tail of every sanctioned cleanup helper: it re-evaluates the flag and
 * the effective target immediately before executing, so a harness cannot reach
 * the destructive path by calling `pool.query` directly with a prepared SQL
 * constant.
 */
async function executeGuardedCleanup(
	pool: GuardedQueryable,
	sql: string,
	params: unknown[],
	env: PgHarnessEnv,
): Promise<unknown> {
	if (!readRunPgIntegrationTestsFlag(env)) {
		throw new Error(
			"refusing to execute a destructive cleanup: RUN_PG_INTEGRATION_TESTS is not enabled (ANX-487). " +
				"Use the guarded cleanup helpers only inside a guarded PostgreSQL harness.",
		);
	}
	assertDestructivePgTarget(env);
	return pool.query(sql, params);
}

/**
 * The only sanctioned way to execute a domain `TRUNCATE` from the test
 * harnesses. Its signature is stable for the existing call sites
 * (`truncateDomainTables(pool, sql)` / `(pool, sql, env)`).
 */
export async function truncateDomainTables(
	pool: TruncateQueryable,
	sql: string,
	env: PgHarnessEnv = process.env,
): Promise<void> {
	if (typeof sql !== "string" || !TRUNCATE_STATEMENT_PATTERN.test(sql)) {
		throw new Error(
			"refusing to execute a non-TRUNCATE statement through truncateDomainTables (ANX-487). " +
				"Only a single TRUNCATE statement is allowed on the sanctioned destructive path.",
		);
	}
	await executeGuardedCleanup(pool, sql, [], env);
}

/**
 * Guarded path for parameterized fixture cleanup that is not a `TRUNCATE` —
 * currently the `DELETE FROM graph_projection_inbox/dlq` reset of ANX-277.
 *
 * ANX-487 round 3: that file used a raw `createPgPool(process.env.DATABASE_URL)`
 * plus a local `RUN_PG_INTEGRATION_TESTS === "true"` check, so a real database
 * could lose real rows. It accepts only a single `TRUNCATE` or `DELETE`
 * statement, revalidates the flag and the effective target immediately before
 * executing, and forwards `params` to the driver (never interpolated).
 */
export async function runGuardedSql(
	pool: GuardedQueryable,
	sql: string,
	params: unknown[] = [],
	env: PgHarnessEnv = process.env,
): Promise<unknown> {
	if (typeof sql !== "string" || !GUARDED_CLEANUP_STATEMENT_PATTERN.test(sql)) {
		throw new Error(
			"refusing to execute a non-cleanup statement through runGuardedSql (ANX-487). " +
				"Only a single TRUNCATE or DELETE statement is allowed on the sanctioned destructive path; " +
				"DDL such as DROP/ALTER is never executed by the test harness.",
		);
	}
	return executeGuardedCleanup(pool, sql, params, env);
}
