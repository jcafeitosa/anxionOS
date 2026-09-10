import {
	AUTONOMY_NORMATIVE_MATRIX,
	assignAutonomyLevelCommandSchema,
	transitionAutonomyLevelCommandSchema,
} from "@anxionos/contracts/governance";
import {
	assignAutonomyLevel,
	evaluateAutonomyCapability,
	getEffectiveAutonomy,
	transitionAutonomyLevel,
	type AutonomyAssignment,
} from "@anxionos/governance";
import { z } from "zod";
import type { GovernancePluginDeps } from "../plugin";

const assignAutonomyBodySchema = assignAutonomyLevelCommandSchema
	.omit({ commandId: true, scopeId: true, subjectAgentId: true })
	.strict();

const transitionAutonomyBodySchema = transitionAutonomyLevelCommandSchema
	.omit({
		commandId: true,
		scopeId: true,
		subjectAgentId: true,
		actorPrincipalId: true,
	})
	.strict();

export const evaluateAutonomyBodySchema = z
	.object({
		agencyId: z.string().uuid(),
		subjectAgentId: z.string().uuid(),
		capability: z.string().min(1),
	})
	.strict();

export const agentIdParamSchema = z.object({
	agentId: z.string().uuid(),
});

export function toAutonomyAssignmentDto(assignment: AutonomyAssignment) {
	return {
		id: assignment.id,
		scopeId: assignment.scopeId,
		subjectAgentId: assignment.subjectAgentId,
		level: assignment.level,
		status: assignment.status,
		evidenceHash: assignment.evidenceHash,
		approvalId: assignment.approvalId,
		authorityEpochAtAssignment: assignment.authorityEpochAtAssignment,
		revision: assignment.revision,
		createdAt: assignment.createdAt.toISOString(),
		updatedAt: assignment.updatedAt.toISOString(),
	};
}

export function handleGetAutonomyMatrix() {
	return {
		matrix: AUTONOMY_NORMATIVE_MATRIX.map((entry) => ({
			level: entry.level,
			label: entry.label,
			effectClass: entry.effectClass,
			eligibleCapabilities: [...entry.eligibleCapabilities],
			runtimeEnabled: entry.runtimeEnabled,
			requiresApprovalToAssign: entry.requiresApprovalToAssign,
		})),
	};
}

export async function handleGetEffectiveAutonomy(
	deps: GovernancePluginDeps,
	input: { agencyId: string; agentId: string },
) {
	const result = await getEffectiveAutonomy(
		{ autonomyAssignmentRepository: deps.autonomyAssignmentRepository },
		{ scopeId: input.agencyId, subjectAgentId: input.agentId },
	);
	return {
		level: result.level,
		assignment: result.assignment
			? toAutonomyAssignmentDto(result.assignment)
			: null,
	};
}

export async function handleAssignAutonomy(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		agentId: string;
		body: unknown;
	},
) {
	const body = assignAutonomyBodySchema.parse(input.body);
	return assignAutonomyLevel(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			scopeId: input.agencyId,
			subjectAgentId: input.agentId,
			...body,
		},
	);
}

export async function handleTransitionAutonomy(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		agentId: string;
		actorPrincipalId: string;
		body: unknown;
	},
) {
	const body = transitionAutonomyBodySchema.parse(input.body);
	return transitionAutonomyLevel(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			scopeId: input.agencyId,
			subjectAgentId: input.agentId,
			actorPrincipalId: input.actorPrincipalId,
			...body,
		},
	);
}

export async function handleEvaluateAutonomyCapability(
	deps: GovernancePluginDeps,
	input: { body: unknown },
) {
	const body = evaluateAutonomyBodySchema.parse(input.body);
	const result = await evaluateAutonomyCapability(
		{
			autonomyAssignmentRepository: deps.autonomyAssignmentRepository,
			grantRepository: deps.grantRepository,
		},
		{
			scopeId: body.agencyId,
			subjectAgentId: body.subjectAgentId,
			capability: body.capability,
		},
	);
	return result;
}
