import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type PublishAgentVersionCommand,
	publishAgentVersionCommandSchema,
} from "@anxionos/contracts/agents";
import { createAgentVersionPublishedEvent } from "../../domain/events/agent-events";
import { isAutonomyLevelRuntimeEnabled } from "../../domain/policies/autonomy-runtime";
import type { AgentPublishGuardPort } from "../../domain/ports/agent-publish-guard";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function publishAgentVersion(
	deps: PublishAgentVersionDeps,
	input: PublishAgentVersionInput,
): Promise<CommandResult> {
	const command = publishAgentVersionCommandSchema.parse(input);
	if (!isAutonomyLevelRuntimeEnabled(command.autonomyLevel)) {
		throwAgentsError(
			"AGT_AUTONOMY_LEVEL_DISABLED",
			`Autonomy level ${command.autonomyLevel} is disabled at runtime`,
		);
	}
	const preflightAgent = await deps.agentRepository.findById(command.agentId);
	if (!preflightAgent) {
		throwAgentsError(
			"AGT_AGENT_NOT_FOUND",
			`Agent not found: ${command.agentId}`,
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		preflightAgent.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}
	if (deps.publishGuard) {
		const agencyId = preflightAgent.agencyId ?? preflightAgent.organizationId;
		await deps.publishGuard.assertPublishAllowed({
			agencyId,
			agentId: command.agentId,
		});
	}

	const agentVersionId = randomUUID();
	const now = new Date();

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
				throwAgentsError(
					"AGT_AGENT_NOT_FOUND",
					`Agent not found: ${command.agentId}`,
				);
			}
			if (agent.revision !== command.expectedRevision) {
				throwAgentsError(
					"AGT_REVISION_CONFLICT",
					`Expected agent revision ${command.expectedRevision}, found ${agent.revision}`,
				);
			}

			const duplicate =
				await context.agentVersionRepository.findByAgentAndVersionNumber(
					command.agentId,
					command.versionNumber,
				);
			if (duplicate) {
				if (duplicate.status === "published") {
					return commandResultSchema.parse({
						aggregateId: duplicate.id,
						revision: agent.revision,
						idempotentReplay: true,
					});
				}
				throwAgentsError(
					"AGT_VERSION_IMMUTABLE",
					`Agent version ${command.versionNumber} already exists as ${duplicate.status}`,
				);
			}

			const nextRevision = agent.revision + 1;
			const result = commandResultSchema.parse({
				aggregateId: agentVersionId,
				revision: nextRevision,
			});
			const event = createAgentVersionPublishedEvent({
				agentVersionId,
				agentId: command.agentId,
				organizationId: agent.organizationId,
				versionNumber: command.versionNumber,
				capabilityManifestHash: command.capabilityManifestHash,
				autonomyLevel: command.autonomyLevel,
				instructionRef: command.instructionRef,
				skillRefs: command.skillRefs,
				revision: nextRevision,
			});

			await context.agentVersionRepository.save({
				id: agentVersionId,
				agentId: command.agentId,
				versionNumber: command.versionNumber,
				status: "published",
				instructionRef: command.instructionRef,
				skillRefs: command.skillRefs,
				capabilityManifestHash: command.capabilityManifestHash,
				modelSlots: command.modelSlots,
				autonomyLevel: command.autonomyLevel,
				publishedAt: now,
				createdAt: now,
			});

			await context.agentRepository.save({
				...agent,
				activeVersionId: agentVersionId,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: agent.organizationId,
				commandId: command.commandId,
				commandName: "PublishAgentVersion",
				aggregateId: agentVersionId,
				aggregateType: "AgentVersion",
				revision: nextRevision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface PublishAgentVersionInput extends PublishAgentVersionCommand {
	actorPrincipalId?: string;
}

export interface PublishAgentVersionDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	publishGuard?: AgentPublishGuardPort;
}
