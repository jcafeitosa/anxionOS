import {
	commandResultSchema,
	transitionAgentStatusCommandSchema,
	type CommandResult,
	type TransitionAgentStatusCommand,
} from "@anxionos/contracts/agents";
import { createAgentStatusChangedEvent } from "../../domain/events/agent-events";
import { canTransitionAgentStatus } from "../../domain/policies/agent-lifecycle";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function transitionAgentStatus(
	deps: TransitionAgentStatusDeps,
	input: TransitionAgentStatusInput,
): Promise<CommandResult> {
	const command = transitionAgentStatusCommandSchema.parse(input);
	const preflightAgent = await deps.agentRepository.findById(command.agentId);
	if (!preflightAgent) {
		throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${command.agentId}`);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		preflightAgent.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(preflightAgent.organizationId, {
			agencyId: preflightAgent.agencyId,
			principalId: input.actorPrincipalId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				preflightAgent.organizationId,
				command.commandId,
			);
			if (raced) {
				return parseCommandResultSnapshot(raced.responseSnapshot);
			}

			const agent = await context.agentRepository.findById(command.agentId);
			if (!agent) {
				throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${command.agentId}`);
			}
			if (agent.revision !== command.expectedRevision) {
				throwAgentsError(
					"AGT_REVISION_CONFLICT",
					`Expected agent revision ${command.expectedRevision}, found ${agent.revision}`,
				);
			}
			if (
				!canTransitionAgentStatus(agent.status, command.targetStatus, {
					hasActiveVersion: Boolean(agent.activeVersionId),
				})
			) {
				throwAgentsError(
					"AGT_STATUS_INVALID",
					`Cannot transition from ${agent.status} to ${command.targetStatus}`,
				);
			}

			const nextRevision = agent.revision + 1;
			const now = new Date();
			const result = commandResultSchema.parse({
				aggregateId: agent.id,
				revision: nextRevision,
			});
			const event = createAgentStatusChangedEvent({
				agentId: agent.id,
				organizationId: agent.organizationId,
				fromStatus: agent.status,
				toStatus: command.targetStatus,
				revision: nextRevision,
			});

			await context.agentRepository.save({
				...agent,
				status: command.targetStatus,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: agent.organizationId,
				commandId: command.commandId,
				commandName: "TransitionAgentStatus",
				aggregateId: agent.id,
				aggregateType: "Agent",
				revision: nextRevision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface TransitionAgentStatusInput extends TransitionAgentStatusCommand {
	actorPrincipalId?: string;
}

export interface TransitionAgentStatusDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
}
