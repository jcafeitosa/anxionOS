import { describe, expect, test } from "bun:test";
import {
	shouldRunPgIntegrationTests,
	withExecutionPgHarness,
} from "../test-support";

describe("execution schema migration (ANX-151 S1)", () => {
	test("core execution tables exist after ensureExecutionSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'execution_venue_adapter_refs',
				     'execution_sessions',
				     'execution_orders',
				     'execution_fills',
				     'execution_command_journal'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"execution_command_journal",
				"execution_fills",
				"execution_orders",
				"execution_sessions",
				"execution_venue_adapter_refs",
			]);
		});
	});

	test("execution_execution_mode enum exists", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const result = await pool.query<{ typname: string }>(
				`SELECT typname
				 FROM pg_type
				 WHERE typname = 'execution_execution_mode'`,
			);
			expect(result.rowCount).toBe(1);
		});
	});

	test("venue adapter refs are unique per organization and kind", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			await pool.query(
				`INSERT INTO execution_venue_adapter_refs (
				   id, organization_id, adapter_kind, status
				 ) VALUES (
				   'ex_vad_test_1', '00000000-0000-4000-8000-000000000005',
				   'SIMULATED', 'ACTIVE'
				 )`,
			);

			await expect(
				pool.query(
					`INSERT INTO execution_venue_adapter_refs (
					   id, organization_id, adapter_kind, status
					 ) VALUES (
					   'ex_vad_test_2', '00000000-0000-4000-8000-000000000005',
					   'SIMULATED', 'ACTIVE'
					 )`,
				),
			).rejects.toThrow(/duplicate key|unique constraint/i);
		});
	});
});
