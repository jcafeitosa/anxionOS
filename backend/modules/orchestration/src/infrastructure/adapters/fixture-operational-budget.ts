import { OPERATIONAL_BUDGET_WAKEUP_UNITS_CAP_PER_ORG } from "../../domain/constants";
import type { OperationalBudgetPort } from "../../domain/ports/operational-budget";

export function createFixtureOperationalBudget(
	capPerOrg: number = OPERATIONAL_BUDGET_WAKEUP_UNITS_CAP_PER_ORG,
): OperationalBudgetPort {
	const consumed = new Map<string, number>();
	return {
		async reserveWakeupUnit(organizationId) {
			const current = consumed.get(organizationId) ?? 0;
			if (current >= capPerOrg) {
				return false;
			}
			consumed.set(organizationId, current + 1);
			return true;
		},
		async remainingWakeupUnits(organizationId) {
			const current = consumed.get(organizationId) ?? 0;
			return Math.max(0, capPerOrg - current);
		},
	};
}
