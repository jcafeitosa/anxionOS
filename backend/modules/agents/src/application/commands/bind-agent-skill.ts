import { randomUUID } from "node:crypto";
import {
	type BindAgentSkillCommand,
	bindAgentSkillCommandSchema,
	type CommandResult,
	commandResultSchema,
} from "@anxionos/contracts/agents";
import { createAgentSkillBoundEvent } from "../../domain/events/agent-events";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SkillBindGuardPort } from "../../domain/ports/skill-bind-guard";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function bindAgentSkill(
	deps: BindAgentSkillDeps,
	input: BindAgentSkillInput,
): Promise<CommandResult> {
	const command = bindAgentSkillCommandSchema.parse(input);
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
	if (deps.skillBindGuard) {
		await deps.skillBindGuard.assertBindAllowed({
			agencyId: preflightAgent.organizationId,
			agentId: command.agentId,
		});
	}

	const bindingId = randomUUID();
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
			if (agent.revision !== command.expectedAgentRevision) {
				throwAgentsError(
					"AGT_REVISION_CONFLICT",
					`Expected agent revision ${command.expectedAgentRevision}, found ${agent.revision}`,
				);
			}

			const agentVersion = await context.agentVersionRepository.findById(
				command.agentVersionId,
			);
			if (!agentVersion || agentVersion.agentId !== command.agentId) {
				throwAgentsError(
					"AGT_VERSION_NOT_FOUND",
					`Agent version not found: ${command.agentVersionId}`,
				);
			}
			if (agentVersion.status !== "draft") {
				throwAgentsError(
					"AGT_VERSION_IMMUTABLE",
					`Agent version ${command.agentVersionId} is not draft`,
				);
			}

			const skillVersion = await context.skillVersionRepository.findById(
				command.skillVersionId,
			);
			if (!skillVersion) {
				throwAgentsError(
					"AGT_SKILL_VERSION_NOT_FOUND",
					`Skill version not found: ${command.skillVersionId}`,
				);
			}
			if (skillVersion.status !== "verified") {
				throwAgentsError(
					"AGT_SKILL_VERSION_NOT_VERIFIED",
					`Skill version ${command.skillVersionId} must be verified before binding`,
				);
			}

			const skill = await context.skillRepository.findById(
				skillVersion.skillId,
			);
			if (!skill) {
				throwAgentsError(
					"AGT_SKILL_NOT_FOUND",
					`Skill not found: ${skillVersion.skillId}`,
				);
			}
			if (skill.organizationId !== agent.organizationId) {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					`Skill ${skill.id} is not in agent organization ${agent.organizationId}`,
				);
			}

			const existingBinding =
				await context.agentSkillBindingRepository.findByAgentVersionAndSkillVersion(
					command.agentVersionId,
					command.skillVersionId,
				);
			if (existingBinding) {
				return commandResultSchema.parse({
					aggregateId: existingBinding.id,
					revision: agent.revision,
					idempotentReplay: true,
				});
			}

			const result = commandResultSchema.parse({
				aggregateId: bindingId,
				revision: agent.revision,
			});
			const event = createAgentSkillBoundEvent({
				agentId: command.agentId,
				agentVersionId: command.agentVersionId,
				skillVersionId: command.skillVersionId,
				organizationId: agent.organizationId,
				bindingConfig: command.bindingConfig,
				revision: agent.revision,
			});

			await context.agentSkillBindingRepository.save({
				id: bindingId,
				agentVersionId: command.agentVersionId,
				skillVersionId: command.skillVersionId,
				bindingConfig: command.bindingConfig,
				createdAt: now,
			});

			await context.commandJournal.record({
				tenantId: agent.organizationId,
				commandId: command.commandId,
				commandName: "BindAgentSkill",
				aggregateId: bindingId,
				aggregateType: "AgentSkillBinding",
				revision: agent.revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface BindAgentSkillInput extends BindAgentSkillCommand {
	actorPrincipalId?: string;
}

export interface BindAgentSkillDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	skillBindGuard?: SkillBindGuardPort;
}
