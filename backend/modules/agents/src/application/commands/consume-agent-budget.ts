import {
	consumeAgentBudgetCommandSchema,
	consumeAgentBudgetResultSchema,
	type ConsumeAgentBudgetCommand,
	type ConsumeAgentBudgetResult,
} from "@anxionos/contracts/agents";
import { createAgentBudgetExhaustedEvent } from "../../domain/events/agent-events";
import type { AgentBudgetRepository } from "../../domain/ports/agent-budget-repository";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import { loadIdempotentCommandResult } from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

function isExhausted(policy: { caps: { wakeupUnitCap: number; tokenUnitCap: number; timeSecondsCap: number }; wakeupUnitsConsumed: number; tokenUnitsConsumed: number; timeSecondsConsumed: number }) {
	return (
		policy.wakeupUnitsConsumed >= policy.caps.wakeupUnitCap ||
		policy.tokenUnitsConsumed >= policy.caps.tokenUnitCap ||
		policy.timeSecondsConsumed >= policy.caps.timeSecondsCap
	);
}

export async function consumeAgentBudget(deps: ConsumeAgentBudgetDeps, input: ConsumeAgentBudgetInput): Promise<ConsumeAgentBudgetResult> {
	const command = consumeAgentBudgetCommandSchema.parse(input);
	const agent = await deps.agentRepository.findById(command.agentId);
	if (!agent) throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${command.agentId}`);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, agent.organizationId, command.commandId);
	if (replay?.aggregateId) {
		const policy = await deps.agentBudgetRepository.findByAgentId(command.agentId);
		if (policy) return consumeAgentBudgetResultSchema.parse({ agentId: command.agentId, revision: policy.revision, status: policy.status, idempotentReplay: true });
	}
	return deps.unitOfWork.runInTransaction(buildOrganizationTenantContext(agent.organizationId, { agencyId: agent.agencyId }), async (context) => {
		const raced = await context.commandJournal.findByCommandId(agent.organizationId, command.commandId);
		if (raced?.responseSnapshot) {
			const parsed = consumeAgentBudgetResultSchema.safeParse(raced.responseSnapshot);
			if (parsed.success) return { ...parsed.data, idempotentReplay: true };
		}
		const policy = await context.agentBudgetRepository.findByAgentId(command.agentId);
		if (!policy) throwAgentsError("AGT_BUDGET_NOT_FOUND", `Budget policy not found for agent: ${command.agentId}`);
		if (policy.revision !== command.expectedRevision) throwAgentsError("AGT_REVISION_CONFLICT", `Expected budget revision ${command.expectedRevision}, found ${policy.revision}`);
		if (policy.status === "exhausted") throwAgentsError("AGT_BUDGET_EXHAUSTED", `Agent budget exhausted: ${command.agentId}`);
		const now = new Date();
		const next = {
			...policy,
			wakeupUnitsConsumed: policy.wakeupUnitsConsumed + command.wakeupUnits,
			tokenUnitsConsumed: policy.tokenUnitsConsumed + command.tokenUnits,
			timeSecondsConsumed: policy.timeSecondsConsumed + command.timeSeconds,
			updatedAt: now,
		};
		const exhausted = isExhausted(next);
		const revision = policy.revision + 1;
		const status = exhausted ? "exhausted" : next.status;
		const saved = await context.agentBudgetRepository.save({ ...next, status, revision });
		const events = [];
		if (exhausted) {
			const pausedAgent = await context.agentRepository.findById(agent.id);
			if (pausedAgent && pausedAgent.status !== "PAUSED") {
				await context.agentRepository.save({ ...pausedAgent, status: "PAUSED", revision: pausedAgent.revision + 1, updatedAt: now });
			}
			events.push(createAgentBudgetExhaustedEvent({ agentId: saved.agentId, organizationId: saved.organizationId, fromStatus: "active", toStatus: "exhausted", revision }));
		}
		const result = consumeAgentBudgetResultSchema.parse({ agentId: saved.agentId, revision: saved.revision, status: saved.status });
		await context.commandJournal.record({ tenantId: agent.organizationId, commandId: command.commandId, commandName: "ConsumeAgentBudget", aggregateId: saved.id, aggregateType: "AgentBudgetPolicy", revision, responseSnapshot: result });
		if (events.length > 0) await context.publishEvents(events);
		return result;
	});
}

export interface ConsumeAgentBudgetInput extends ConsumeAgentBudgetCommand { actorPrincipalId?: string; }
export interface ConsumeAgentBudgetDeps { unitOfWork: AgentsUnitOfWork; commandJournal: CommandJournalRepository; agentRepository: AgentRepository; agentBudgetRepository: AgentBudgetRepository; }
