import {
	commandResultSchema,
	rollbackAgentVersionCommandSchema,
	type CommandResult,
	type RollbackAgentVersionCommand,
} from "@anxionos/contracts/agents";
import { createAgentVersionRolledBackEvent } from "../../domain/events/agent-events";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentVersionRepository } from "../../domain/ports/agent-version-repository";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function rollbackAgentVersion(
	deps: RollbackAgentVersionDeps,
	input: RollbackAgentVersionInput,
): Promise<CommandResult> {
	const command = rollbackAgentVersionCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(deps.commandJournal, command.commandId);
	if (replay) {
		return replay;
	}

	const preflightAgent = await deps.agentRepository.findById(command.agentId);
	if (!preflightAgent) {
		throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${command.agentId}`);
	}

	const targetVersion = await deps.agentVersionRepository.findByAgentAndVersionNumber(
		command.agentId,
		command.targetVersionNumber,
	);
	if (!targetVersion || targetVersion.status !== "published") {
		throwAgentsError(
			"AGT_VERSION_NOT_FOUND",
			`Published version ${command.targetVersionNumber} not found for agent ${command.agentId}`,
		);
	}

	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(preflightAgent.organizationId, {
			agencyId: preflightAgent.agencyId,
			principalId: input.actorPrincipalId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(command.commandId);
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

			const version = await context.agentVersionRepository.findByAgentAndVersionNumber(
				command.agentId,
				command.targetVersionNumber,
			);
			if (!version || version.status !== "published") {
				throwAgentsError(
					"AGT_VERSION_NOT_FOUND",
					`Published version ${command.targetVersionNumber} not found`,
				);
			}

			const nextRevision = agent.revision + 1;
			const now = new Date();
			const result = commandResultSchema.parse({
				aggregateId: agent.id,
				revision: nextRevision,
			});
			const event = createAgentVersionRolledBackEvent({
				agentId: agent.id,
				organizationId: agent.organizationId,
				fromVersionId: agent.activeVersionId,
				toVersionId: version.id,
				toVersionNumber: version.versionNumber,
				revision: nextRevision,
			});

			await context.agentRepository.save({
				...agent,
				activeVersionId: version.id,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "RollbackAgentVersion",
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

export interface RollbackAgentVersionInput extends RollbackAgentVersionCommand {
	actorPrincipalId?: string;
}

export interface RollbackAgentVersionDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
}
