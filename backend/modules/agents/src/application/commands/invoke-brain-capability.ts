import { randomUUID } from "node:crypto";
import {
	commandResultSchema,
	invokeBrainCapabilityCommandSchema,
	type CommandResult,
	type InvokeBrainCapabilityCommand,
} from "@anxionos/contracts/agents";
import { createBrainInvocationRequestedEvent } from "../../domain/events/agent-events";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import type { AgentVersionRepository } from "../../domain/ports/agent-version-repository";
import type { BrainInvocationGuardPort } from "../../domain/ports/brain-invocation-guard";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { AgentsUnitOfWork } from "../../domain/ports/agents-unit-of-work";
import { readSnapshotString, toCommandResultSnapshot } from "../command-support";
import { parseCommandResultSnapshot, throwAgentsError } from "../errors";
import { buildOrganizationTenantContext } from "../services/tenant-context";

export async function invokeBrainCapability(
	deps: InvokeBrainCapabilityDeps,
	input: InvokeBrainCapabilityInput,
): Promise<CommandResult & { invocationId: string; agentVersionId: string }> {
	const command = invokeBrainCapabilityCommandSchema.parse(input);
	const preflightAgent = await deps.agentRepository.findById(command.agentId);
	if (!preflightAgent) {
		throwAgentsError("AGT_AGENT_NOT_FOUND", `Agent not found: ${command.agentId}`);
	}
	const existingJournal = await deps.commandJournal.findByCommandId(
		preflightAgent.organizationId,
		command.commandId,
	);
	if (existingJournal) {
		const replay = parseCommandResultSnapshot(existingJournal.responseSnapshot);
		const replayedAgentVersionId =
			readSnapshotString(existingJournal.responseSnapshot, "agentVersionId") ??
			command.agentVersionId ??
			"";
		return {
			...replay,
			invocationId: replay.aggregateId,
			agentVersionId: replayedAgentVersionId,
		};
	}
	const agentVersionId =
		command.agentVersionId ?? preflightAgent.activeVersionId;
	if (!agentVersionId) {
		throwAgentsError(
			"AGT_VERSION_NOT_FOUND",
			`Agent ${command.agentId} has no active version`,
		);
	}
	const version = await deps.agentVersionRepository.findById(agentVersionId);
	if (!version || version.agentId !== command.agentId) {
		throwAgentsError("AGT_VERSION_NOT_FOUND", `Agent version not found: ${agentVersionId}`);
	}
	if (version.status !== "published") {
		throwAgentsError(
			"AGT_VERSION_NOT_FOUND",
			`Agent version ${agentVersionId} is not published`,
		);
	}

	const agencyId = preflightAgent.agencyId ?? preflightAgent.organizationId;
	if (deps.invocationGuard) {
		await deps.invocationGuard.assertInvokeAllowed({
			agencyId,
			agentId: command.agentId,
			capabilityId: command.capabilityId,
		});
	}

	const invocationId = randomUUID();

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
				const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
				const racedAgentVersionId =
					readSnapshotString(raced.responseSnapshot, "agentVersionId") ?? agentVersionId;
				return {
					...parsed,
					invocationId: parsed.aggregateId,
					agentVersionId: racedAgentVersionId,
				};
			}

			const result = commandResultSchema.parse({
				aggregateId: invocationId,
				revision: preflightAgent.revision,
			});
			const event = createBrainInvocationRequestedEvent({
				invocationId,
				agentId: command.agentId,
				agentVersionId,
				organizationId: preflightAgent.organizationId,
				capabilityId: command.capabilityId,
				correlationId: command.correlationId,
			});

			await context.commandJournal.record({
				tenantId: preflightAgent.organizationId,
				commandId: command.commandId,
				commandName: "InvokeBrainCapability",
				aggregateId: invocationId,
				aggregateType: "BrainInvocation",
				revision: preflightAgent.revision,
				responseSnapshot: toCommandResultSnapshot(result, { agentVersionId }),
			});
			await context.publishEvents([event]);
			return {
				...result,
				invocationId,
				agentVersionId,
			};
		},
	);
}

export interface InvokeBrainCapabilityInput extends InvokeBrainCapabilityCommand {
	actorPrincipalId?: string;
}

export interface InvokeBrainCapabilityDeps {
	unitOfWork: AgentsUnitOfWork;
	commandJournal: CommandJournalRepository;
	agentRepository: AgentRepository;
	agentVersionRepository: AgentVersionRepository;
	invocationGuard?: BrainInvocationGuardPort;
}
