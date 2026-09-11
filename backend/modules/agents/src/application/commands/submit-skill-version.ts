import {
	type CommandResult,
	commandResultSchema,
	type SubmitSkillVersionCommand,
	submitSkillVersionCommandSchema,
} from "@anxionos/contracts/agents";
import { createSkillVersionSubmittedEvent } from "../../domain/events/agent-events";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SkillRepository } from "../../domain/ports/skill-repository";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function submitSkillVersion(
	deps: SubmitSkillVersionDeps,
	input: SubmitSkillVersionInput,
): Promise<CommandResult> {
	const command = submitSkillVersionCommandSchema.parse(input);
	const preflightSkill = await deps.skillRepository.findById(command.skillId);
	if (!preflightSkill) {
		throwAgentsError(
			"AGT_SKILL_NOT_FOUND",
			`Skill not found: ${command.skillId}`,
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		preflightSkill.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const now = new Date();

	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(preflightSkill.organizationId, {
			agencyId: preflightSkill.agencyId,
			principalId: input.actorPrincipalId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				preflightSkill.organizationId,
				command.commandId,
			);
			if (raced) {
				return parseCommandResultSnapshot(raced.responseSnapshot);
			}

			const skill = await context.skillRepository.findById(command.skillId);
			if (!skill) {
				throwAgentsError(
					"AGT_SKILL_NOT_FOUND",
					`Skill not found: ${command.skillId}`,
				);
			}
			if (skill.revision !== command.expectedRevision) {
				throwAgentsError(
					"AGT_REVISION_CONFLICT",
					`Expected skill revision ${command.expectedRevision}, found ${skill.revision}`,
				);
			}

			const version = await context.skillVersionRepository.findById(
				command.skillVersionId,
			);
			if (!version || version.skillId !== command.skillId) {
				throwAgentsError(
					"AGT_SKILL_VERSION_NOT_FOUND",
					`Skill version not found: ${command.skillVersionId}`,
				);
			}
			if (version.status !== "draft") {
				throwAgentsError(
					"AGT_SKILL_VERSION_IMMUTABLE",
					`Skill version ${command.skillVersionId} is not draft`,
				);
			}

			const nextRevision = skill.revision + 1;
			const result = commandResultSchema.parse({
				aggregateId: command.skillVersionId,
				revision: nextRevision,
			});
			const event = createSkillVersionSubmittedEvent({
				skillId: command.skillId,
				skillVersionId: command.skillVersionId,
				organizationId: skill.organizationId,
				versionNumber: version.versionNumber,
				fromStatus: "draft",
				toStatus: "candidate",
				revision: nextRevision,
			});

			await context.skillVersionRepository.save({
				...version,
				status: "candidate",
			});

			await context.skillRepository.save({
				...skill,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: skill.organizationId,
				commandId: command.commandId,
				commandName: "SubmitSkillVersion",
				aggregateId: command.skillVersionId,
				aggregateType: "SkillVersion",
				revision: nextRevision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface SubmitSkillVersionInput extends SubmitSkillVersionCommand {
	actorPrincipalId?: string;
}

export interface SubmitSkillVersionDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	skillRepository: SkillRepository;
}
