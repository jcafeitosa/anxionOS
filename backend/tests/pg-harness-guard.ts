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

/**
 * Query-parameter values are never needed in a refusal message and any of them
 * (`password`, `user`, `sslcert`, `sslkey`, ...) can carry a secret, so every
 * value is scrubbed. Using a name blocklist proved unreliable (ANX-487
 * rounds 3-5); redacting all values is fail-closed.
 */
const QUERY_VALUE_PATTERN = /([?&][^=&#\s]*)=[^&#\s]*/g;

/** IPv4 dotted quad — an unambiguous host form that can never be a password. */
const IPV4_LITERAL_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

/** IPv6 literal (after bracket stripping) — also unambiguous. */
const IPV6_LITERAL_PATTERN = /^[0-9A-Fa-f:]+$/;

function isIpLiteralHost(host: string): boolean {
	return IPV4_LITERAL_PATTERN.test(host) || IPV6_LITERAL_PATTERN.test(host);
}

/** Reader used by the harnesses; mirrors the old local `getDatabaseUrl`. */
export function getDatabaseUrl(
	env: PgHarnessEnv = process.env,
): string | undefined {
	const raw = env.DATABASE_URL?.trim();
	return raw ? raw : undefined;
}

/**
 * Identifier shapes that are safe to print in a refusal message: a PostgreSQL
 * database name or a plain host. Deliberately an **allowlist**.
 */
const PRINTABLE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_.-]+$/;

/** IPv6 literal, bracketed (`[::1]`) or bare (`::1`). */
const PRINTABLE_IPV6_PATTERN = /^\[[0-9A-Fa-f:.]+\]$|^[0-9A-Fa-f:.]+$/;

/**
 * Scrubs a bare fragment — the effective `host` or `database` the driver
 * resolved — before it is embedded in a refusal message.
 *
 * ANX-487 round 4 — this is now an **allowlist**, after G4 proved that every
 * blocklist attempt leaked. A malformed `DATABASE_URL` makes the driver fold
 * the userinfo into `database`: `postgres:alice:S3cr3t` resolves to
 * `database = "lice:S3cr3t"`, which has **no `@`** and whose leading segment
 * (`lice:`) even looks like a URL scheme — so both the "drop up to the last `@`"
 * rule (round 3) and a scheme-aware rule return it verbatim and print the
 * password.
 *
 * A legitimate database name or host never needs anything outside
 * `[A-Za-z0-9_.-]` (or an IPv6 literal). Anything else is treated as
 * credential-bearing and replaced wholesale: the operator loses a detail, the
 * log never gains a secret.
 */
export function redactCredentialFragment(value: string): string {
	if (value === "") {
		return value;
	}
	if (PRINTABLE_IDENTIFIER_PATTERN.test(value)) {
		return value;
	}
	if (PRINTABLE_IPV6_PATTERN.test(value)) {
		return value;
	}
	return REDACTION_MARKER;
}

/**
 * Scrubs the **authority** of a URL (`[userinfo@]host[:port]`).
 *
 * Keeps `host:port` readable — it is exactly what the operator needs to
 * diagnose a non-loopback refusal — but redacts anything that cannot be one:
 * a `user:password` pair is indistinguishable from `host:port` except that the
 * segment after the last `:` is not a port.
 */
function redactAuthority(authority: string): string {
	const lastAt = authority.lastIndexOf("@");
	if (lastAt >= 0) {
		return `${REDACTION_MARKER}@${authority.slice(lastAt + 1)}`;
	}
	if (authority.startsWith("[")) {
		const close = authority.indexOf("]");
		const suffix = close > 0 ? authority.slice(close + 1) : null;
		if (suffix !== null && (suffix === "" || /^:\d{1,5}$/.test(suffix))) {
			return authority;
		}
		return REDACTION_MARKER;
	}
	const lastColon = authority.lastIndexOf(":");
	if (lastColon < 0) {
		return authority;
	}
	const maybePort = authority.slice(lastColon + 1);
	const maybeHost = authority.slice(0, lastColon);
	if (/^\d{1,5}$/.test(maybePort) && !maybeHost.includes(":")) {
		return authority;
	}
	return REDACTION_MARKER;
}

/**
 * Removes credentials before a URL is embedded in an error message.
 *
 * ANX-487 round 2 (finding 3): the invalid-URL error used to interpolate
 * `JSON.stringify(rawUrl)` verbatim, so a malformed URL printed the whole
 * password.
 *
 * ANX-487 round 4: the `@`-based rule only covered URLs that **have** an `@`.
 * G4 proved `postgres://alice:S3cr3t` (and the `//`-less sibling) printed the
 * password in full. The URL is now split at the scheme and the authority is
 * scrubbed by {@link redactAuthority}, which keeps `host:port` but refuses
 * anything whose last segment is not a port. Secret-looking query parameters
 * are scrubbed as before.
 */
export function redactDatabaseUrl(rawUrl: string): string {
	const scheme = /^[A-Za-z][A-Za-z0-9+.-]*:(?:\/\/)?/.exec(rawUrl);
	let redacted: string;
	if (!scheme) {
		// No scheme, the whole value is attacker-controlled: a bare identifier
		// (`S3cr3t-DO-NOT-LEAK`) could be a password, and an authority parse
		// would happily "confirm" it. Fail closed — print nothing of it.
		redacted = REDACTION_MARKER;
	} else {
		const head = scheme[0];
		const rest = rawUrl.slice(head.length);
		const authorityEnd = rest.search(/[/?#]/);
		const authority = authorityEnd >= 0 ? rest.slice(0, authorityEnd) : rest;
		const tail = authorityEnd >= 0 ? rest.slice(authorityEnd) : "";
		// Path: only print when it is one of the project's KNOWN scratch/protected
		// names. An arbitrary valid-looking segment (`/S3cr3t-DO-NOT-LEAK`) is an
		// equally plausible password, so it is printed as the marker.
		const pathMatch = /^\/([^?#]*)/.exec(tail);
		const path = pathMatch?.[1] ?? "";
		const pathPart =
			path !== "" &&
			(isScratchDatabaseName(path) ||
				PROTECTED_DATABASES.has(path.toLowerCase()))
				? `/${path}`
				: path !== ""
					? `/***REDACTED***`
					: "";
		const queryPart = pathMatch ? tail.slice(pathMatch[0].length) : "";
		redacted = `${head}${redactAuthority(authority)}${pathPart}${queryPart}`;
	}
	return redacted.replace(QUERY_VALUE_PATTERN, `$1=${REDACTION_MARKER}`);
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
		// The offending scheme is NOT printed: an attacker-controlled value
		// (e.g. `alice:S3cr3t`) parses as exactly one URL scheme per RFC 3986,
		// so a "got <scheme>" would leak the first label of a userinfo.
		throw new Error(
			"DATABASE_URL must use the postgres:// or postgresql:// protocol (ANX-487). " +
				"Refusing to run the destructive TRUNCATE harness.",
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
	const safeHost =
		LOOPBACK_HOSTS.has(host) || isIpLiteralHost(host)
			? redactCredentialFragment(host)
			: REDACTION_MARKER;
	const safeDatabase =
		PROTECTED_DATABASES.has(database.toLowerCase()) ||
		isScratchDatabaseName(database)
			? redactCredentialFragment(database)
			: REDACTION_MARKER;

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
