import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	type TransitionAutonomyLevelCommand,
	transitionAutonomyLevelCommandSchema,
} from "@anxionos/contracts/governance";
import {
	createAuthorityEpochBumpedEvent,
	createAutonomyTransitionedEvent,
} from "../../domain/events/governance-events";
import { validateAutonomyTransition } from "../../domain/policies/autonomy-normative-matrix";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface TransitionAutonomyLevelDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function transitionAutonomyLevel(
	deps: TransitionAutonomyLevelDeps,
	input: TransitionAutonomyLevelCommand,
): Promise<GovernanceCommandResult> {
	const command = transitionAutonomyLevelCommandSchema.parse(input);

	const tenantContext: TenantContext = {
		tenantId: command.scopeId,
		agencyId: command.scopeId,
		principalId: command.actorPrincipalId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 4 — a transicao cria um novo assignment; mesma key so'
		// repete para o MESMO agente/escopo/nivel-alvo.
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "TransitionAutonomyLevel",
				matchesAggregate: async (aggregateId) => {
					const assignment =
						await context.autonomyAssignmentRepository.findById(aggregateId);
					if (!assignment) {
						return false;
					}
					return (
						assignment.scopeId === command.scopeId &&
						assignment.subjectAgentId === command.subjectAgentId &&
						assignment.level === command.targetLevel
					);
				},
			},
		);
		if (raced) {
			return raced;
		}

		const current =
			await context.autonomyAssignmentRepository.findActiveByAgentAndScope(
				command.scopeId,
				command.subjectAgentId,
			);
		if (!current && command.transitionKind !== "takeover") {
			throwGovernanceError(
				"GOV_AUTONOMY_ASSIGNMENT_NOT_FOUND",
				`No active autonomy assignment for agent ${command.subjectAgentId}`,
			);
		}

		const validation = validateAutonomyTransition({
			currentLevel: current?.level ?? null,
			targetLevel: command.targetLevel,
			transitionKind: command.transitionKind,
			hasApproval: command.approvalId !== undefined,
			hasEvidence: command.evidenceHash !== undefined,
		});
		if (!validation.allowed) {
			const code = validation.reason?.includes("disabled")
				? "GOV_AUTONOMY_LEVEL_DISABLED"
				: "GOV_AUTONOMY_TRANSITION_DENIED";
			throwGovernanceError(code, validation.reason ?? "Transition denied");
		}

		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const now = new Date();
		const fromLevel = current?.level ?? null;

		if (current) {
			await context.autonomyAssignmentRepository.save({
				...current,
				status: "superseded",
				revision: current.revision + 1,
				updatedAt: now,
			});
		}

		const assignmentId = randomUUID();
		const revision = 1;
		await context.autonomyAssignmentRepository.save({
			id: assignmentId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			subjectAgentId: command.subjectAgentId,
			level: command.targetLevel,
			status: "active",
			evidenceHash: command.evidenceHash ?? null,
			approvalId: command.approvalId ?? null,
			authorityEpochAtAssignment: bumpedEpoch.epoch,
			revision,
			createdAt: now,
			updatedAt: now,
		});

		const events = [
			createAutonomyTransitionedEvent({
				assignmentId,
				scopeId: command.scopeId,
				subjectAgentId: command.subjectAgentId,
				fromLevel,
				toLevel: command.targetLevel,
				transitionKind: command.transitionKind,
				actorPrincipalId: command.actorPrincipalId,
				reason: command.reason,
				authorityEpoch: bumpedEpoch.epoch,
				revision,
			}),
			createAuthorityEpochBumpedEvent({
				scopeId: command.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: `autonomy.${command.transitionKind}`,
			}),
		];
		await context.publishEvents(events);

		const result = governanceCommandResultSchema.parse({
			aggregateId: assignmentId,
			revision,
			authorityEpoch: bumpedEpoch.epoch,
		});
		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "TransitionAutonomyLevel",
			aggregateId: assignmentId,
			aggregateType: "AutonomyAssignment",
			revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
