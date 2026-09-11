import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { AgentBudgetPolicy } from "../../domain/entities/agent-budget-policy";
import type { AgentBudgetRepository } from "../../domain/ports/agent-budget-repository";
import { type AgentBudgetPolicyRow, agentBudgetPolicies } from "./schema";

export function toAgentBudgetPolicy(
	row: AgentBudgetPolicyRow,
): AgentBudgetPolicy {
	return {
		id: row.id,
		organizationId: row.organizationId,
		agentId: row.agentId,
		caps: {
			wakeupUnitCap: row.wakeupUnitCap,
			tokenUnitCap: row.tokenUnitCap,
			timeSecondsCap: row.timeSecondsCap,
		},
		wakeupUnitsConsumed: row.wakeupUnitsConsumed,
		tokenUnitsConsumed: row.tokenUnitsConsumed,
		timeSecondsConsumed: row.timeSecondsConsumed,
		status: row.status,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAgentBudgetRepository(
	db: NodePgDatabase<{ agentBudgetPolicies: typeof agentBudgetPolicies }>,
): AgentBudgetRepository {
	return {
		async save(policy) {
			const existing = await db
				.select()
				.from(agentBudgetPolicies)
				.where(eq(agentBudgetPolicies.id, policy.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(agentBudgetPolicies)
					.set({
						wakeupUnitCap: policy.caps.wakeupUnitCap,
						tokenUnitCap: policy.caps.tokenUnitCap,
						timeSecondsCap: policy.caps.timeSecondsCap,
						wakeupUnitsConsumed: policy.wakeupUnitsConsumed,
						tokenUnitsConsumed: policy.tokenUnitsConsumed,
						timeSecondsConsumed: policy.timeSecondsConsumed,
						status: policy.status,
						revision: policy.revision,
						updatedAt: policy.updatedAt,
					})
					.where(eq(agentBudgetPolicies.id, policy.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update agent budget policy");
				return toAgentBudgetPolicy(row);
			}
			const rows = await db
				.insert(agentBudgetPolicies)
				.values({
					id: policy.id,
					tenantId: policy.organizationId,
					organizationId: policy.organizationId,
					agentId: policy.agentId,
					wakeupUnitCap: policy.caps.wakeupUnitCap,
					tokenUnitCap: policy.caps.tokenUnitCap,
					timeSecondsCap: policy.caps.timeSecondsCap,
					wakeupUnitsConsumed: policy.wakeupUnitsConsumed,
					tokenUnitsConsumed: policy.tokenUnitsConsumed,
					timeSecondsConsumed: policy.timeSecondsConsumed,
					status: policy.status,
					revision: policy.revision,
					createdAt: policy.createdAt,
					updatedAt: policy.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agent budget policy");
			return toAgentBudgetPolicy(row);
		},
		async findByAgentId(agentId) {
			const rows = await db
				.select()
				.from(agentBudgetPolicies)
				.where(eq(agentBudgetPolicies.agentId, agentId))
				.limit(1);
			return rows[0] ? toAgentBudgetPolicy(rows[0]) : null;
		},
	};
}
