import { randomUUID } from "node:crypto";
import {
	type AssignAutonomyLevelCommand,
	assignAutonomyLevelCommandSchema,
	type GovernanceCommandResult,
	governanceCommandResultSchema,
} from "@anxionos/contracts/governance";
import type { AutonomyAssignment } from "../../domain/entities/autonomy-assignment";
import {
	createAuthorityEpochBumpedEvent,
	createAutonomyAssignedEvent,
} from "../../domain/events/governance-events";
import { validateInitialAssignment } from "../../domain/policies/autonomy-normative-matrix";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface AssignAutonomyLevelDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function assignAutonomyLevel(
	deps: AssignAutonomyLevelDeps,
	input: AssignAutonomyLevelCommand,
): Promise<GovernanceCommandResult> {
	const command = assignAutonomyLevelCommandSchema.parse(input);

	const validation = validateInitialAssignment(
		command.level,
		command.approvalId !== undefined,
	);
	if (!validation.allowed) {
		throwGovernanceError(
			validation.reason?.includes("disabled")
				? "GOV_AUTONOMY_LEVEL_DISABLED"
				: "GOV_AUTONOMY_TRANSITION_DENIED",
			validation.reason ?? "Assignment denied",
		);
	}

	const tenantContext: TenantContext = {
		tenantId: command.scopeId,
		agencyId: command.scopeId,
		principalId: command.subjectAgentId,
	};

	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 4 + A (MEDIUM do G2) — mesma key so' repete para o MESMO
		// agente/escopo/nivel E para os mesmos `evidenceHash`/`approvalId`, que o
		// assignment persiste. Sem eles, reusar a key com uma evidencia/aprovacao
		// divergente devolvia 200 `idempotentReplay` e o payload novo era
		// ignorado.
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "AssignAutonomyLevel",
				matchesAggregate: async (aggregateId) => {
					const assignment =
						await context.autonomyAssignmentRepository.findById(aggregateId);
					if (!assignment) {
						return false;
					}
					return (
						assignment.scopeId === command.scopeId &&
						assignment.subjectAgentId === command.subjectAgentId &&
						assignment.level === command.level &&
						assignment.evidenceHash === (command.evidenceHash ?? null) &&
						assignment.approvalId === (command.approvalId ?? null)
					);
				},
			},
		);
		if (raced) {
			return raced;
		}

		const existing =
			await context.autonomyAssignmentRepository.findActiveByAgentAndScope(
				command.scopeId,
				command.subjectAgentId,
			);
		if (existing) {
			throwGovernanceError(
				"GOV_AUTONOMY_ASSIGNMENT_EXISTS",
				`Active autonomy assignment already exists for agent ${command.subjectAgentId}`,
			);
		}

		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const now = new Date();
		const assignmentId = randomUUID();
		const assignment: AutonomyAssignment = {
			id: assignmentId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			subjectAgentId: command.subjectAgentId,
			level: command.level,
			status: "active",
			evidenceHash: command.evidenceHash ?? null,
			approvalId: command.approvalId ?? null,
			authorityEpochAtAssignment: bumpedEpoch.epoch,
			revision: 1,
			createdAt: now,
			updatedAt: now,
		};
		await context.autonomyAssignmentRepository.save(assignment);

		const events = [
			createAutonomyAssignedEvent({
				assignmentId,
				scopeId: command.scopeId,
				subjectAgentId: command.subjectAgentId,
				level: command.level,
				authorityEpoch: bumpedEpoch.epoch,
				revision: 1,
			}),
			createAuthorityEpochBumpedEvent({
				scopeId: command.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "autonomy.assigned",
			}),
		];
		await context.publishEvents(events);

		const result = governanceCommandResultSchema.parse({
			aggregateId: assignmentId,
			revision: 1,
			authorityEpoch: bumpedEpoch.epoch,
		});
		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "AssignAutonomyLevel",
			aggregateId: assignmentId,
			aggregateType: "AutonomyAssignment",
			revision: 1,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
