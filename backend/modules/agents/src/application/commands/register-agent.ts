import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type RegisterAgentCommand,
	registerAgentCommandSchema,
} from "@anxionos/contracts/agents";
import { createAgentRegisteredEvent } from "../../domain/events/agent-events";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function registerAgent(
	deps: RegisterAgentDeps,
	input: RegisterAgentInput,
): Promise<CommandResult> {
	const command = registerAgentCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		input.organizationId,
		command.commandId,
	);
	if (replay) {
		return replay;
	}

	const agentId = randomUUID();
	const now = new Date();
	const revision = 1;
	const result = commandResultSchema.parse({
		aggregateId: agentId,
		revision,
	});
	const event = createAgentRegisteredEvent({
		agentId,
		organizationId: input.organizationId,
		agencyId: command.agencyId,
		kind: command.kind,
		displayName: command.displayName,
		status: "DRAFT",
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

			await context.agentRepository.save({
				id: agentId,
				organizationId: input.organizationId,
				agencyId: command.agencyId,
				kind: command.kind,
				displayName: command.displayName,
				status: "DRAFT",
				revision,
				createdAt: now,
				updatedAt: now,
			});

			await context.commandJournal.record({
				tenantId: input.organizationId,
				commandId: command.commandId,
				commandName: "RegisterAgent",
				aggregateId: agentId,
				aggregateType: "Agent",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface RegisterAgentInput extends RegisterAgentCommand {
	organizationId: string;
	actorPrincipalId?: string;
}

export interface RegisterAgentDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
}
