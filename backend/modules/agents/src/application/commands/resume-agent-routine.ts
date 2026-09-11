import {
	type CommandResult,
	commandResultSchema,
	type ResumeAgentRoutineCommand,
	resumeAgentRoutineCommandSchema,
} from "@anxionos/contracts/agents";
import { createAgentRoutineResumedEvent } from "../../domain/events/agent-events";
import type { AgentRoutineRepository } from "../../domain/ports/agent-routine-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function resumeAgentRoutine(
	deps: ResumeAgentRoutineDeps,
	input: ResumeAgentRoutineInput,
): Promise<CommandResult> {
	const command = resumeAgentRoutineCommandSchema.parse(input);
	const pre = await deps.agentRoutineRepository.findById(command.routineId);
	if (!pre)
		throwAgentsError(
			"AGT_ROUTINE_NOT_FOUND",
			`Routine not found: ${command.routineId}`,
		);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		pre.organizationId,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(pre.organizationId),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				pre.organizationId,
				command.commandId,
			);
			if (raced) return parseCommandResultSnapshot(raced.responseSnapshot);
			const routine = await context.agentRoutineRepository.findById(
				command.routineId,
			);
			if (!routine)
				throwAgentsError(
					"AGT_ROUTINE_NOT_FOUND",
					`Routine not found: ${command.routineId}`,
				);
			if (routine.revision !== command.expectedRevision)
				throwAgentsError(
					"AGT_REVISION_CONFLICT",
					`Expected routine revision ${command.expectedRevision}, found ${routine.revision}`,
				);
			if (routine.status === "active") {
				return commandResultSchema.parse({
					aggregateId: routine.id,
					revision: routine.revision,
					idempotentReplay: true,
				});
			}
			const now = new Date();
			const revision = routine.revision + 1;
			const updated = await context.agentRoutineRepository.save({
				...routine,
				status: "active",
				revision,
				updatedAt: now,
			});
			const result = commandResultSchema.parse({
				aggregateId: updated.id,
				revision,
			});
			await context.commandJournal.record({
				tenantId: pre.organizationId,
				commandId: command.commandId,
				commandName: "ResumeAgentRoutine",
				aggregateId: updated.id,
				aggregateType: "AgentRoutine",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([
				createAgentRoutineResumedEvent({
					routineId: updated.id,
					agentId: updated.agentId,
					organizationId: updated.organizationId,
					fromStatus: "paused",
					toStatus: "active",
					revision,
				}),
			]);
			return result;
		},
	);
}

export interface ResumeAgentRoutineInput extends ResumeAgentRoutineCommand {
	actorPrincipalId?: string;
}
export interface ResumeAgentRoutineDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRoutineRepository: AgentRoutineRepository;
}
