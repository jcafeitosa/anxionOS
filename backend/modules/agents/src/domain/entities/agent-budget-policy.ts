import type {
	AgentBudgetCaps,
	AgentBudgetStatus,
} from "@anxionos/contracts/agents";

export interface AgentBudgetPolicy {
	id: string;
	organizationId: string;
	agentId: string;
	caps: AgentBudgetCaps;
	wakeupUnitsConsumed: number;
	tokenUnitsConsumed: number;
	timeSecondsConsumed: number;
	status: AgentBudgetStatus;
	revision: number;
	createdAt: Date;
	updatedAt: Date;
}
