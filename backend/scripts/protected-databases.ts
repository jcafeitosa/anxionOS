/**
 * ANX-487 — single source of truth for the database names that destructive
 * tooling must refuse, plus the test/scratch naming pattern the PostgreSQL test
 * harnesses accept.
 *
 * This module is deliberately neutral: it imports nothing, so both sides can
 * share it without inverting the dependency direction.
 *   - `scripts/fresh-db-oracle.mjs` refuses to `DROP DATABASE` a protected name;
 *   - `tests/pg-harness-guard.ts` refuses to `TRUNCATE` a protected name.
 *
 * `scripts/` must never import from `tests/` (production tooling cannot depend
 * on test code), so the shared list lives here and not in `tests/`.
 */

/**
 * Databases reserved for dev/shared/held use — tooling must never `DROP` or
 * `TRUNCATE` them. Seeded from the ANX-463 oracle list so the oracle and the
 * test harnesses agree on what "real data" means.
 *
 * ANX-487 round 2: `anxionos_prod`, `anxionos_production` and `anxionos_staging`
 * were accepted before (they matched `anxionos_.+`); a real local database with
 * one of those names would have been truncated. They are now refused by both
 * the protected list and {@link RESERVED_ENVIRONMENT_DATABASE_PATTERN}.
 */
export const PROTECTED_DATABASES: ReadonlySet<string> = new Set([
	"postgres",
	"template0",
	"template1",
	"anxionos",
	"anxionos_g2r",
	"anxionos_g3r",
	"anxionos_g3r2",
	"anxionos_g4r",
	"anxionos_g5r",
	"anxionos_g5r2",
	"anxionos_org",
	"anxionos_prod",
	"anxionos_production",
	"anxionos_staging",
]);

/**
 * Names that look like a deployed environment instead of a scratch database
 * (ANX-487 round 2, finding 2).
 *
 * The old pattern (`^anxionos_.+$` with `/i`) accepted any `anxionos_*` suffix,
 * so `anxionos_prod` / `anxionos_production` / `ANXIONOS_prod` passed and could
 * be truncated. This reserved-segment rule refuses them — and environment
 * variants such as `anxionos_prod2`, `anxionos_staging_eu` or `my_prod_test` —
 * before the scratch pattern is even considered. It is deliberately
 * conservative: a refused name fails safe, because the operator can still opt
 * in with `ALLOW_DESTRUCTIVE_TEST_DB=true`.
 *
 * The segment must start at a `_`/start boundary and must not be followed by a
 * lowercase letter, so `anxionos_provision`/`myprod_test` are not false
 * positives while `anxionos_prod2`/`anxionos_production2` still are.
 */
export const RESERVED_ENVIRONMENT_DATABASE_PATTERN =
	/(?:^|_)(?:production|prod|staging|stage|live)(?![a-z])/i;

/**
 * Documented scratch/test names accepted by the destructive PostgreSQL
 * harnesses (checked AFTER {@link PROTECTED_DATABASES} and
 * {@link RESERVED_ENVIRONMENT_DATABASE_PATTERN}):
 *
 *   - any `anxionos_<scratch>` scratch database — the convention used by the
 *     oracle (`anxionos_oracle`, `anxionos_oracle_neg`) and by the review/gate
 *     harnesses (`anxionos_g2r`, `anxionos_g3r2`, `anxionos_g2r477`,
 *     `anxionos_g3_460`, `anxionos_g5r_460`, `anxionos_anx487`, ...);
 *   - generic scratch suffixes: `_test`, `_oracle`, `_oracle_neg`, `_scratch`,
 *     `_wt`, `_zero`, and the `_g<digit>r<digits>` review pattern.
 *
 * Bare `anxionos` (dev) is intentionally NOT matched by the prefix rule: the
 * captured prefix requires `anxionos_` plus a non-empty scratch suffix.
 */
export const SCRATCH_DATABASE_PATTERN =
	/^(?:anxionos_.+|[a-z0-9_]+(?:_test|_oracle|_oracle_neg|_scratch|_wt|_zero|_g\d+r\d*))$/i;

/**
 * True when `name` is an accepted scratch/test database name.
 *
 * Environment-looking names are refused first so the broad `anxionos_<scratch>`
 * convention cannot re-admit `anxionos_prod` / `anxionos_production` /
 * `anxionos_staging`.
 */
export function isScratchDatabaseName(name: string): boolean {
	if (RESERVED_ENVIRONMENT_DATABASE_PATTERN.test(name)) {
		return false;
	}
	return SCRATCH_DATABASE_PATTERN.test(name);
}
