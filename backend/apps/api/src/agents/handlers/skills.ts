import { institutionalUuidSchema } from "@anxionos/contracts";
import {
	bindAgentSkillCommandSchema,
	createSkillVersionCommandSchema,
	recordSkillVersionEvaluationCommandSchema,
	registerSkillCommandSchema,
	submitSkillVersionCommandSchema,
} from "@anxionos/contracts/agents";
import {
	AgentsCommandError,
	bindAgentSkill,
	createSkillVersion,
	getAgent,
	recordSkillVersionEvaluation,
	registerSkill,
	submitSkillVersion,
} from "@anxionos/agents";
import { z } from "zod";
import type { AgentsPluginDeps } from "../plugin";

const registerSkillBodySchema = registerSkillCommandSchema
	.omit({ commandId: true })
	.strict();

const createSkillVersionBodySchema = createSkillVersionCommandSchema
	.omit({ commandId: true, skillId: true })
	.strict();

const submitSkillVersionBodySchema = submitSkillVersionCommandSchema
	.omit({ commandId: true, skillId: true, skillVersionId: true })
	.strict();

const recordSkillEvaluationBodySchema = recordSkillVersionEvaluationCommandSchema
	.omit({ commandId: true, skillId: true, skillVersionId: true })
	.strict();

const bindAgentSkillBodySchema = bindAgentSkillCommandSchema
	.omit({ commandId: true, agentId: true })
	.strict();

export const skillIdParamSchema = z.object({
	skillId: institutionalUuidSchema,
});

export const skillVersionIdParamSchema = z.object({
	skillVersionId: institutionalUuidSchema,
});

async function assertSkillInAgency(
	deps: AgentsPluginDeps,
	agencyId: string,
	skillId: string,
) {
	const skill = await deps.skillRepository.findById(skillId);
	if (!skill || skill.organizationId !== agencyId) {
		throw new AgentsCommandError("AGT_SKILL_NOT_FOUND", `Skill not found: ${skillId}`);
	}
	return skill;
}

export async function handleRegisterSkill(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = registerSkillBodySchema.parse(input.body);
	const result = await registerSkill(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			skillRepository: deps.skillRepository,
		},
		{
			commandId: input.commandId,
			...body,
			agencyId: body.agencyId ?? input.agencyId,
			organizationId: input.agencyId,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		skillId: result.aggregateId,
	};
}

export async function handleCreateSkillVersion(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		skillId: string;
		principalId: string;
		body: unknown;
	},
) {
	await assertSkillInAgency(deps, input.agencyId, input.skillId);
	const body = createSkillVersionBodySchema.parse(input.body);
	const result = await createSkillVersion(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			skillRepository: deps.skillRepository,
		},
		{
			commandId: input.commandId,
			skillId: input.skillId,
			...body,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		skillVersionId: result.aggregateId,
	};
}

export async function handleSubmitSkillVersion(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		skillId: string;
		skillVersionId: string;
		principalId: string;
		body: unknown;
	},
) {
	await assertSkillInAgency(deps, input.agencyId, input.skillId);
	const body = submitSkillVersionBodySchema.parse(input.body);
	const result = await submitSkillVersion(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			skillRepository: deps.skillRepository,
		},
		{
			commandId: input.commandId,
			skillId: input.skillId,
			skillVersionId: input.skillVersionId,
			...body,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		skillVersionId: result.aggregateId,
	};
}

export async function handleRecordSkillVersionEvaluation(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		skillId: string;
		skillVersionId: string;
		principalId: string;
		body: unknown;
	},
) {
	await assertSkillInAgency(deps, input.agencyId, input.skillId);
	const body = recordSkillEvaluationBodySchema.parse(input.body);
	const result = await recordSkillVersionEvaluation(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			skillRepository: deps.skillRepository,
			skillEvaluationGuard: deps.skillEvaluationGuard,
		},
		{
			commandId: input.commandId,
			skillId: input.skillId,
			skillVersionId: input.skillVersionId,
			...body,
			actorPrincipalId: input.principalId,
		},
	);
	return {
		...result,
		skillVersionId: result.aggregateId,
	};
}

export async function handleBindAgentSkill(
	deps: AgentsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		agentId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = bindAgentSkillBodySchema.parse(input.body);
	await getAgent(
		{ agentRepository: deps.agentRepository },
		{ agentId: input.agentId, organizationId: input.agencyId },
	);
	const result = await bindAgentSkill(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			agentRepository: deps.agentRepository,
			skillBindGuard: deps.skillBindGuard,
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
		bindingId: result.aggregateId,
	};
}
