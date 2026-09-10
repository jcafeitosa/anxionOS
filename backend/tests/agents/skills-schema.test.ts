import { describe, expect, test } from "bun:test";
import { withAgentsPgHarness } from "./test-support";

describe("agents skills schema (ANX-143 S8)", () => {
	test(
		"migration 0002 creates skills, skill_versions and agent_skill_bindings tables",
		async () => {
			await withAgentsPgHarness(async ({ pool }) => {
				const result = await pool.query<{ table_name: string }>(
					`SELECT table_name
           FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name IN (
               'agents_skills',
               'agents_skill_versions',
               'agents_agent_skill_bindings'
             )
           ORDER BY table_name`,
				);
				expect(result.rows.map((row) => row.table_name)).toEqual([
					"agents_agent_skill_bindings",
					"agents_skill_versions",
					"agents_skills",
				]);
			});
		},
		{ skip: process.env.RUN_PG_INTEGRATION_TESTS !== "true" },
	);
});
