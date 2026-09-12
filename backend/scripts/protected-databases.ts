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
]);

/**
 * Documented scratch/test names accepted by the destructive PostgreSQL
 * harnesses (checked AFTER {@link PROTECTED_DATABASES}):
 *
 *   - any `anxionos_<suffix>` scratch database — the convention used by the
 *     oracle (`anxionos_oracle`, `anxionos_oracle_neg`) and by the review
 *     harnesses (`anxionos_g2r`, `anxionos_g3r2`, `anxionos_g4r`, ...);
 *   - generic scratch suffixes: `_test`, `_oracle`, `_oracle_neg`, `_scratch`,
 *     `_wt`, `_zero`, and the `_g<digit>r<digits>` review pattern.
 *
 * Bare `anxionos` (dev) is intentionally NOT matched by the prefix rule: the
 * captured prefix requires `anxionos_` plus a non-empty scratch suffix.
 */
export const SCRATCH_DATABASE_PATTERN =
	/^(?:anxionos_.+|[a-z0-9_]+(?:_test|_oracle|_oracle_neg|_scratch|_wt|_zero|_g\d+r\d*))$/i;

/** True when `name` is an accepted scratch/test database name. */
export function isScratchDatabaseName(name: string): boolean {
	return SCRATCH_DATABASE_PATTERN.test(name);
}
