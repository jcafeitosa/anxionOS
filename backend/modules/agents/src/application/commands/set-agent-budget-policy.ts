import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type SetAgentBudgetPolicyCommand,
	setAgentBudgetPolicyCommandSchema,
} from "@anxionos/contracts/agents";
import { createAgentBudgetPolicySetEvent } from "../../domain/events/agent-events";
import type { AgentBudgetRepository } from "../../domain/ports/agent-budget-repository";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function setAgentBudgetPolicy(
	deps: SetAgentBudgetPolicyDeps,
	input: SetAgentBudgetPolicyInput,
): Promise<CommandResult> {
	const command = setAgentBudgetPolicyCommandSchema.parse(input);
	const agent = await deps.agentRepository.findById(command.agentId);
	if (!agent)
		throwAgentsError(
			"AGT_AGENT_NOT_FOUND",
			`Agent not found: ${command.agentId}`,
		);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		agent.organizationId,
		command.commandId,
	);
	if (replay) return replay;
	const existing = await deps.agentBudgetRepository.findByAgentId(
		command.agentId,
	);
	const policyId = existing?.id ?? randomUUID();
	const now = new Date();
	const revision = existing ? existing.revision + 1 : 1;
	const result = commandResultSchema.parse({ aggregateId: policyId, revision });
	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(agent.organizationId, {
			agencyId: agent.agencyId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				agent.organizationId,
				command.commandId,
			);
			if (raced) return parseCommandResultSnapshot(raced.responseSnapshot);
			const saved = await context.agentBudgetRepository.save({
				id: policyId,
				organizationId: agent.organizationId,
				agentId: command.agentId,
				caps: command.caps,
				wakeupUnitsConsumed: existing?.wakeupUnitsConsumed ?? 0,
				tokenUnitsConsumed: existing?.tokenUnitsConsumed ?? 0,
				timeSecondsConsumed: existing?.timeSecondsConsumed ?? 0,
				status: "active",
				revision,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			});
			await context.commandJournal.record({
				tenantId: agent.organizationId,
				commandId: command.commandId,
				commandName: "SetAgentBudgetPolicy",
				aggregateId: saved.id,
				aggregateType: "AgentBudgetPolicy",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([
				createAgentBudgetPolicySetEvent({
					agentId: saved.agentId,
					organizationId: saved.organizationId,
					caps: saved.caps,
					status: saved.status,
					revision,
				}),
			]);
			return result;
		},
	);
}

export interface SetAgentBudgetPolicyInput extends SetAgentBudgetPolicyCommand {
	actorPrincipalId?: string;
}
export interface SetAgentBudgetPolicyDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	agentBudgetRepository: AgentBudgetRepository;
}
