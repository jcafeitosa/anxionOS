import { describe, expect, test } from "bun:test";
import {
	shouldRunPgIntegrationTests,
	withEvaluationPgHarness,
} from "../test-support";

describe("evaluation schema migration (ANX-160 S2)", () => {
	test("core evaluation tables exist after ensureEvaluationSchema", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'public'
				   AND table_name IN (
				     'evaluation_records',
				     'evaluation_scores',
				     'evaluation_command_journal',
				     'evaluation_certifications'
				   )
				 ORDER BY table_name`,
			);
			expect(result.rows.map((row) => row.table_name)).toEqual([
				"evaluation_certifications",
				"evaluation_command_journal",
				"evaluation_records",
				"evaluation_scores",
			]);
		});
	});

	test("isolated drizzle journal schema exists", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withEvaluationPgHarness(async ({ pool }) => {
			const result = await pool.query<{ table_name: string }>(
				`SELECT table_name
				 FROM information_schema.tables
				 WHERE table_schema = 'evaluation'
				   AND table_name = '__drizzle_migrations'`,
			);
			expect(result.rowCount).toBe(1);
		});
	});
});
