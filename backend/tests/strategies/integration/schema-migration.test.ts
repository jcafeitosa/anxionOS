import { describe, expect, test } from "bun:test";
import {
	shouldRunPgIntegrationTests,
	withStrategiesPgHarness,
} from "../test-support";

describe("strategies schema migration (ANX-147 S1)", () => {
	test("core strategies tables exist after ensureStrategiesSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withStrategiesPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'strategies',
				     'strategy_versions',
				     'strategies_command_journal',
				     'strategies_backtest_runs',
				     'strategies_deployments',
				     'strategies_signals'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"strategies",
				"strategies_backtest_runs",
				"strategies_command_journal",
				"strategies_deployments",
				"strategies_signals",
				"strategy_versions",
			]);
		});
	});

	test("published strategy version hashes are immutable (ST-R05-02)", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		await withStrategiesPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO strategies (id, organization_id, display_name, execution_mode, status, revision)
				 VALUES ('st_str_test', '00000000-0000-4000-8000-000000000001', 'alpha', 'SIMULATED', 'ACTIVE', 1)`,
			);
			await pool.query(
				`INSERT INTO strategy_versions (
				   id, strategy_id, organization_id, version_number,
				   source_hash, rules_hash, parameters_hash,
				   lifecycle_state, execution_mode, revision, published_at
				 ) VALUES (
				   'st_ver_test', 'st_str_test', '00000000-0000-4000-8000-000000000001', 1,
				   repeat('a', 64), repeat('b', 64), repeat('c', 64),
				   'DRAFT', 'SIMULATED', 1, now()
				 )`,
			);

			await expect(
				pool.query(
					`UPDATE strategy_versions
					 SET source_hash = repeat('d', 64)
					 WHERE id = 'st_ver_test'`,
				),
			).rejects.toThrow(/ST_VERSION_IMMUTABLE/);
		});
	});
});
