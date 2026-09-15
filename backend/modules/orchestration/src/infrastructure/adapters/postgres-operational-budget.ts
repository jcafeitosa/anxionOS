import { OPERATIONAL_BUDGET_WAKEUP_UNITS_CAP_PER_ORG } from "../../domain/constants";
import type { OperationalBudgetPort } from "../../domain/ports/operational-budget";

export const DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION =
	OPERATIONAL_BUDGET_WAKEUP_UNITS_CAP_PER_ORG;

export interface OperationalBudgetQueryable {
	query<T extends Record<string, number>>(
		text: string,
		values?: readonly unknown[],
	): Promise<{ rows: T[] }>;
}

export interface PostgresOperationalBudgetOptions {
	capPerOrganization?: number;
}

function resolveCap(options: PostgresOperationalBudgetOptions): number {
	const cap =
		options.capPerOrganization ??
		DEFAULT_OPERATIONAL_BUDGET_CAP_PER_ORGANIZATION;
	if (!Number.isSafeInteger(cap) || cap <= 0) {
		throw new Error("Operational budget cap must be a positive integer");
	}
	return cap;
}

function assertOrganizationId(organizationId: string): void {
	if (!organizationId.trim()) {
		throw new Error("Operational budget organizationId is required");
	}
}

export function createPostgresOperationalBudget(
	client: OperationalBudgetQueryable,
	options: PostgresOperationalBudgetOptions = {},
): OperationalBudgetPort {
	const capPerOrganization = resolveCap(options);

	return {
		async reserveWakeupUnit(organizationId) {
			assertOrganizationId(organizationId);
			const result = await client.query<{ consumed_units: number }>(
				`
				INSERT INTO orchestration_operational_budgets
					(organization_id, cap_units, consumed_units)
				VALUES ($1, $2, 1)
				ON CONFLICT (organization_id) DO UPDATE
				SET consumed_units = orchestration_operational_budgets.consumed_units + 1,
					updated_at = CURRENT_TIMESTAMP
				WHERE orchestration_operational_budgets.consumed_units <
					orchestration_operational_budgets.cap_units
				RETURNING consumed_units
				`,
				[organizationId, capPerOrganization],
			);
			return result.rows.length === 1;
		},
		async remainingWakeupUnits(organizationId) {
			assertOrganizationId(organizationId);
			const result = await client.query<{
				cap_units: number;
				consumed_units: number;
			}>(
				`SELECT cap_units, consumed_units
				 FROM orchestration_operational_budgets
				 WHERE organization_id = $1`,
				[organizationId],
			);
			const row = result.rows[0];
			if (!row) {
				return capPerOrganization;
			}
			return Math.max(0, row.cap_units - row.consumed_units);
		},
	};
}
