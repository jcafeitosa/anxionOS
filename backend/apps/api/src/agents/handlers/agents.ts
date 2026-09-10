import {
	publishAgentVersionCommandSchema,
	registerAgentCommandSchema,
} from "@anxionos/contracts/agents";
import {
	getAgent,
	listAgentVersions,
	publishAgentVersion,
	registerAgent,
	type Agent,
	type AgentVersion,
} from "@anxionos/agents";
import { z } from "zod";
import type { AgentsPluginDeps } from "../plugin";

const registerAgentBodySchema = registerAgentCommandSchema
	.omit({ commandId: true })
	.strict();

const publishAgentVersionBodySchema = publishAgentVersionCommandSchema
	.omit({ commandId: true, agentId: true })
	.strict();

export const agentIdParamSchema = z.object({
	agentId: z.string().uuid(),
});

export function toAgentDto(agent: Agent) {
	return {
		id: agent.id,
		organizationId: agent.organizationId,
		agencyId: agent.agencyId ?? null,
		kind: agent.kind,
		displayName: agent.displayName,
		status: agent.status,
		activeVersionId: agent.activeVersionId ?? null,
		revision: agent.revision,
		createdAt: agent.createdAt.toISOString(),
		updatedAt: agent.updatedAt.toISOString(),
	};
}

export function toAgentVersionDto(version: AgentVersion) {
	return {
		id: version.id,
		agentId: version.agentId,
		versionNumber: version.versionNumber,
		status: version.status,
		instructionRef: version.instructionRef,
		skillRefs: version.skillRefs,
		capabilityManifestHash: version.capabilityManifestHash,
		modelSlots: version.modelSlots,
		autonomyLevel: version.autonomyLevel,
		publishedAt: version.publishedAt?.toISOString() ?? null,
		createdAt: version.createdAt.toISOString(),
	};
}

export async function handleRegisterAgent(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = registerAgentBodySchema.parse(input.body);
	const result = await registerAgent(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			displayName: body.displayName,
			kind: body.kind,
			agencyId: body.agencyId ?? input.agencyId,
			organizationId: input.agencyId,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		agentId: result.aggregateId,
	};
}

export async function handleGetAgent(
	deps: AgentsPluginDeps,
	input: { agencyId: string; agentId: string },
) {
	const agent = await getAgent(
		{ agentRepository: deps.agentRepository },
		{ agentId: input.agentId, organizationId: input.agencyId },
	);
	return toAgentDto(agent);
}

export async function handleListAgentVersions(
	deps: AgentsPluginDeps,
	input: { agencyId: string; agentId: string },
) {
	const versions = await listAgentVersions(
		{
			agentRepository: deps.agentRepository,
			agentVersionRepository: deps.agentVersionRepository,
		},
		{ agentId: input.agentId, organizationId: input.agencyId },
	);
	return {
		versions: versions.map(toAgentVersionDto),
	};
}

export async function handlePublishAgentVersion(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		agentId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = publishAgentVersionBodySchema.parse(input.body);
	const agent = await getAgent(
		{ agentRepository: deps.agentRepository },
		{ agentId: input.agentId, organizationId: input.agencyId },
	);
	const result = await publishAgentVersion(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			agentRepository: deps.agentRepository,
		},
		{
			commandId: input.commandId,
			agentId: input.agentId,
			...body,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		agentVersionId: result.aggregateId,
		agentRevision: agent.revision + 1,
	};
}
