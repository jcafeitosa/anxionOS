import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createPostgresOperationalBudget,
	DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION,
	ensureOrchestrationSchema,
} from "@anxionos/orchestration";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../pg-harness-guard";

type QueryResponse = { rows: Array<Record<string, number>> };

function createQueryable(responses: QueryResponse[]) {
	const queries: Array<{ text: string; values: unknown[] }> = [];
	return {
		queries,
		query: async (text: string, values: unknown[] = []) => {
			queries.push({ text, values });
			const response = responses.shift();
			if (!response) {
				throw new Error("unexpected query");
			}
			return response;
		},
	};
}

describe("Postgres operational budget", () => {
	test("reserves atomically and reports false when the cap is reached", async () => {
		const client = createQueryable([
			{ rows: [{ consumed_units: 1 }] },
			{ rows: [] },
		]);
		const budget = createPostgresOperationalBudget(client, {
			capPerOrganization: 2,
		});

		expect(await budget.reserveWakeupUnit("org-a")).toBe(true);
		expect(await budget.reserveWakeupUnit("org-a")).toBe(false);
		expect(client.queries[0]?.values).toEqual(["org-a", 2]);
		expect(client.queries[0]?.text).toContain("ON CONFLICT");
		expect(client.queries[0]?.text).toContain("consumed_units <");
	});

	test("uses the stored cap and returns the configured cap for a new organization", async () => {
		const client = createQueryable([
			{ rows: [{ cap_units: 10, consumed_units: 3 }] },
			{ rows: [] },
		]);
		const budget = createPostgresOperationalBudget(client, {
			capPerOrganization: DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION,
		});

		expect(await budget.remainingWakeupUnits("org-a")).toBe(7);
		expect(await budget.remainingWakeupUnits("org-b")).toBe(
			DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION,
		);
		expect(client.queries[1]?.values).toEqual(["org-b"]);
	});
});

describe("Postgres operational budget integration", () => {
	test("does not exceed the cap under concurrent reservations", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const databaseUrl = getDatabaseUrl();
		if (!databaseUrl) return;

		const pool = createPgPool(databaseUrl);
		const organizationId = `budget-${randomUUID()}`;
		try {
			await ensureOrchestrationSchema(pool);
			const budget = createPostgresOperationalBudget(pool, {
				capPerOrganization: 10,
			});
			const results = await Promise.all(
				Array.from({ length: 24 }, () =>
					budget.reserveWakeupUnit(organizationId),
				),
			);
			const accepted = results.filter(Boolean);
			const rejected = results.filter((result) => !result);

			expect(accepted).toHaveLength(10);
			expect(rejected).toHaveLength(14);
			expect(await budget.remainingWakeupUnits(organizationId)).toBe(0);

			const row = await pool.query<{ consumed_units: number }>(
				"SELECT consumed_units FROM orchestration_operational_budgets WHERE organization_id = $1",
				[organizationId],
			);
			expect(Number(row.rows[0]?.consumed_units)).toBe(10);
		} finally {
			await pool.query(
				"DELETE FROM orchestration_operational_budgets WHERE organization_id = $1",
				[organizationId],
			);
			await pool.end();
		}
	});
});
