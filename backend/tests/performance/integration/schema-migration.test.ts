import { describe, expect, test } from "bun:test";
import {
	shouldRunPgIntegrationTests,
	withPerformancePgHarness,
} from "../test-support";

describe("performance schema migration (ANX-154 S1+S4)", () => {
	test("core performance tables exist after ensurePerformanceSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'performance_metric_definitions',
				     'performance_outcome_snapshots',
				     'performance_position_exposure_snapshots',
				     'performance_metric_series',
				     'performance_metric_points',
				     'performance_pnl_series',
				     'performance_command_journal'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"performance_command_journal",
				"performance_metric_definitions",
				"performance_metric_points",
				"performance_metric_series",
				"performance_outcome_snapshots",
				"performance_pnl_series",
				"performance_position_exposure_snapshots",
			]);
		});
	});

	test("official metric definitions are seeded (G3-PERF-S1-01)", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPerformancePgHarness(async ({ pool }) => {
			const result = await pool.query<{ metric_code: string }>(
				`SELECT metric_code
				 FROM performance_metric_definitions
				 ORDER BY metric_code`,
			);
			expect(result.rows.map((row) => row.metric_code)).toEqual([
				"exposure.provisional_cash",
				"exposure.quantity",
				"exposure.signed_quantity",
				"pnl.cash_net_delta",
				"pnl.fees_total",
				"pnl.notional_total",
			]);
		});
	});
});
