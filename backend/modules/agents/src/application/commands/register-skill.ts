import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type RegisterSkillCommand,
	registerSkillCommandSchema,
} from "@anxionos/contracts/agents";
import { createSkillRegisteredEvent } from "../../domain/events/agent-events";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SkillRepository } from "../../domain/ports/skill-repository";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function registerSkill(
	deps: RegisterSkillDeps,
	input: RegisterSkillInput,
): Promise<CommandResult> {
	const command = registerSkillCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		input.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const existing = await deps.skillRepository.findByOrganizationAndSlug(
		input.organizationId,
		command.slug,
	);
	if (existing) {
		throwAgentsError(
			"AGT_SKILL_SLUG_CONFLICT",
			`Skill slug already exists: ${command.slug}`,
		);
	}

	const skillId = randomUUID();
	const now = new Date();
	const revision = 1;
	const result = commandResultSchema.parse({
		aggregateId: skillId,
		revision,
	});
	const event = createSkillRegisteredEvent({
		skillId,
		organizationId: input.organizationId,
		agencyId: command.agencyId,
		slug: command.slug,
		displayName: command.displayName,
		revision,
	});

	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(input.organizationId, {
			agencyId: command.agencyId,
			principalId: input.actorPrincipalId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				input.organizationId,
				command.commandId,
			);
			if (raced) {
				return parseCommandResultSnapshot(raced.responseSnapshot);
			}

			const racedSlug = await context.skillRepository.findByOrganizationAndSlug(
				input.organizationId,
				command.slug,
			);
			if (racedSlug) {
				throwAgentsError(
					"AGT_SKILL_SLUG_CONFLICT",
					`Skill slug already exists: ${command.slug}`,
				);
			}

			await context.skillRepository.save({
				id: skillId,
				organizationId: input.organizationId,
				agencyId: command.agencyId,
				slug: command.slug,
				displayName: command.displayName,
				description: command.description,
				revision,
				createdAt: now,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: input.organizationId,
				commandId: command.commandId,
				commandName: "RegisterSkill",
				aggregateId: skillId,
				aggregateType: "Skill",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface RegisterSkillInput extends RegisterSkillCommand {
	organizationId: string;
	actorPrincipalId?: string;
}

export interface RegisterSkillDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	skillRepository: SkillRepository;
}
