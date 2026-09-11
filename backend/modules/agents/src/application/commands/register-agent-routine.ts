import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type RegisterAgentRoutineCommand,
	registerAgentRoutineCommandSchema,
} from "@anxionos/contracts/agents";
import { createAgentRoutineRegisteredEvent } from "../../domain/events/agent-events";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentRoutineRepository } from "../../domain/ports/agent-routine-repository";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function registerAgentRoutine(
	deps: RegisterAgentRoutineDeps,
	input: RegisterAgentRoutineInput,
): Promise<CommandResult> {
	const command = registerAgentRoutineCommandSchema.parse(input);
	const agent = await deps.agentRepository.findById(command.agentId);
	if (!agent)
		throwAgentsError(
			"AGT_AGENT_NOT_FOUND",
			`Agent not found: ${command.agentId}`,
		);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		agent.organizationId,
		command.commandId,
	);
	if (replay) return replay;
	const existing = await deps.agentRoutineRepository.findByAgentAndSlug(
		command.agentId,
		command.slug,
	);
	if (existing)
		throwAgentsError(
			"AGT_ROUTINE_SLUG_CONFLICT",
			`Routine slug already exists: ${command.slug}`,
		);
	const routineId = randomUUID();
	const now = new Date();
	const revision = 1;
	const result = commandResultSchema.parse({
		aggregateId: routineId,
		revision,
	});
	const event = createAgentRoutineRegisteredEvent({
		routineId,
		agentId: command.agentId,
		organizationId: agent.organizationId,
		slug: command.slug,
		displayName: command.displayName,
		triggerKind: command.triggerKind,
		triggerConfig: command.triggerConfig,
		status: "active",
		revision,
	});
	return deps.unitOfWork.runInTransaction(
		buildOrganizationTenantContext(agent.organizationId, {
			agencyId: agent.agencyId,
			principalId: input.actorPrincipalId,
		}),
		async (context) => {
			const raced = await context.commandJournal.findByCommandId(
				agent.organizationId,
				command.commandId,
			);
			if (raced) return parseCommandResultSnapshot(raced.responseSnapshot);
			await context.agentRoutineRepository.save({
				id: routineId,
				organizationId: agent.organizationId,
				agentId: command.agentId,
				slug: command.slug,
				displayName: command.displayName,
				triggerKind: command.triggerKind,
				triggerConfig: command.triggerConfig,
				cooldownSeconds: command.cooldownSeconds,
				status: "active",
				revision,
				createdAt: now,
				updatedAt: now,
			});
			await context.commandJournal.record({
				tenantId: agent.organizationId,
				commandId: command.commandId,
				commandName: "RegisterAgentRoutine",
				aggregateId: routineId,
				aggregateType: "AgentRoutine",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface RegisterAgentRoutineInput extends RegisterAgentRoutineCommand {
	organizationId?: string;
	actorPrincipalId?: string;
}
export interface RegisterAgentRoutineDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	agentRoutineRepository: AgentRoutineRepository;
}
