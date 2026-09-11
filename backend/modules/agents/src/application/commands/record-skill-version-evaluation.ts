import {
	type CommandResult,
	commandResultSchema,
	type RecordSkillVersionEvaluationCommand,
	recordSkillVersionEvaluationCommandSchema,
} from "@anxionos/contracts/agents";
import { createSkillVersionEvaluatedEvent } from "../../domain/events/agent-events";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { SkillEvaluationGuardPort } from "../../domain/ports/skill-evaluation-guard";
import type { SkillRepository } from "../../domain/ports/skill-repository";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { assertEvaluationRefMatchesOutcome } from "../services/evaluation-ref-gate";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function recordSkillVersionEvaluation(
	deps: RecordSkillVersionEvaluationDeps,
	input: RecordSkillVersionEvaluationInput,
): Promise<CommandResult> {
	const command = recordSkillVersionEvaluationCommandSchema.parse(input);
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

	assertEvaluationRefMatchesOutcome({
		outcome: command.outcome,
		evaluationRef: command.evaluationRef,
	});
	if (deps.skillEvaluationGuard) {
		if (!input.actorPrincipalId) {
			throwAgentsError(
				"AGT_TRAVERSAL_DENIED",
				"Actor principal required for skill evaluation guard",
			);
		}
		await deps.skillEvaluationGuard.assertEvaluationAllowed({
			organizationId: preflightSkill.organizationId,
			agencyId: preflightSkill.agencyId ?? preflightSkill.organizationId,
			skillId: command.skillId,
			skillVersionId: command.skillVersionId,
			outcome: command.outcome,
			evaluationRef: command.evaluationRef,
			actorPrincipalId: input.actorPrincipalId,
		});
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
			if (version.status !== "candidate") {
				throwAgentsError(
					"AGT_SKILL_EVALUATION_REQUIRED",
					`Skill version ${command.skillVersionId} must be candidate before evaluation`,
				);
			}

			const nextRevision = skill.revision + 1;
			const result = commandResultSchema.parse({
				aggregateId: command.skillVersionId,
				revision: nextRevision,
			});
			const event = createSkillVersionEvaluatedEvent({
				skillId: command.skillId,
				skillVersionId: command.skillVersionId,
				organizationId: skill.organizationId,
				versionNumber: version.versionNumber,
				fromStatus: "candidate",
				toStatus: command.outcome,
				evaluationRef: command.evaluationRef,
				revision: nextRevision,
			});

			await context.skillVersionRepository.save({
				...version,
				status: command.outcome,
				evaluationRef: command.evaluationRef,
				promotedAt: command.outcome === "verified" ? now : undefined,
			});

			await context.skillRepository.save({
				...skill,
				revision: nextRevision,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: skill.organizationId,
				commandId: command.commandId,
				commandName: "RecordSkillVersionEvaluation",
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

export interface RecordSkillVersionEvaluationInput
	extends RecordSkillVersionEvaluationCommand {
	actorPrincipalId?: string;
}

export interface RecordSkillVersionEvaluationDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	skillRepository: SkillRepository;
	skillEvaluationGuard?: SkillEvaluationGuardPort;
}
