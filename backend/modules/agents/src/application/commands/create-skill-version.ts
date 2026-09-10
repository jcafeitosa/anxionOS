import { randomUUID } from "node:crypto";
import {
	commandResultSchema,
	createSkillVersionCommandSchema,
	type CommandResult,
	type CreateSkillVersionCommand,
} from "@anxionos/contracts/agents";
import { createSkillVersionCreatedEvent } from "../../domain/events/agent-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SkillRepository } from "../../domain/ports/skill-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function createSkillVersion(
	deps: CreateSkillVersionDeps,
	input: CreateSkillVersionInput,
): Promise<CommandResult> {
	const command = createSkillVersionCommandSchema.parse(input);
	const preflightSkill = await deps.skillRepository.findById(command.skillId);
	if (!preflightSkill) {
		throwAgentsError("AGT_SKILL_NOT_FOUND", `Skill not found: ${command.skillId}`);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		preflightSkill.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const skillVersionId = randomUUID();
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
				throwAgentsError("AGT_SKILL_NOT_FOUND", `Skill not found: ${command.skillId}`);
			}

			const versionNumber = await context.skillVersionRepository.getNextVersionNumber(
				command.skillId,
			);
			const nextRevision = skill.revision + 1;
			const result = commandResultSchema.parse({
				aggregateId: skillVersionId,
				revision: nextRevision,
			});
			const event = createSkillVersionCreatedEvent({
				skillId: command.skillId,
				skillVersionId,
				organizationId: skill.organizationId,
				versionNumber,
				schemaVersion: command.schemaVersion,
				contentRef: command.contentRef,
				contentHash: command.contentHash,
				status: "draft",
				permissionRequirements: command.permissionRequirements,
				sandboxPolicy: command.sandboxPolicy,
				revision: nextRevision,
			});

			await context.skillVersionRepository.save({
				id: skillVersionId,
				skillId: command.skillId,
				versionNumber,
				status: "draft",
				schemaVersion: command.schemaVersion,
				contentRef: command.contentRef,
				contentHash: command.contentHash,
				permissionRequirements: command.permissionRequirements,
				sandboxPolicy: command.sandboxPolicy,
				createdAt: now,
			});

			await context.skillRepository.save({
				...skill,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: skill.organizationId,
				commandId: command.commandId,
				commandName: "CreateSkillVersion",
				aggregateId: skillVersionId,
				aggregateType: "SkillVersion",
				revision: nextRevision,
				responseSnapshot: toCommandResultSnapshot(result, { versionNumber }),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface CreateSkillVersionInput extends CreateSkillVersionCommand {
	actorPrincipalId?: string;
}

export interface CreateSkillVersionDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	skillRepository: SkillRepository;
}
