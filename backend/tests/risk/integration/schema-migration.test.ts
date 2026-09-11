import { describe, expect, test } from "bun:test";
import { shouldRunPgIntegrationTests, withRiskPgHarness } from "../test-support";

describe("risk schema migration (ANX-150 S1)", () => {
	test("core risk tables exist after ensureRiskSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'risk_epoch_registry',
				     'risk_limit_policies',
				     'risk_check_results',
				     'risk_permits',
				     'risk_command_journal',
				     'risk_kill_switch_state',
				     'risk_consumer_dedup'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"risk_check_results",
				"risk_command_journal",
				"risk_consumer_dedup",
				"risk_epoch_registry",
				"risk_kill_switch_state",
				"risk_limit_policies",
				"risk_permits",
			]);
		});
	});

	test("risk_execution_mode enum exists", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withRiskPgHarness(async ({ pool }) => {
			const result = await pool.query<{ typname: string }>(
				`SELECT typname
				 FROM pg_type
				 WHERE typname = 'risk_execution_mode'`,
			);
			expect(result.rowCount).toBe(1);
		});
	});
});
