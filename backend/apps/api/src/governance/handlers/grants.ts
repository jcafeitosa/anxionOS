import { issueGrantCommandSchema, revokeGrantCommandSchema } from "@anxionos/contracts/governance";
import {
	GovernanceCommandError,
	issueGrant,
	listEffectiveGrants,
	revokeGrant,
	type Grant,
} from "@anxionos/governance";
import { z } from "zod";
import type { GovernancePluginDeps } from "../plugin";

const issueGrantBodySchema = issueGrantCommandSchema
	.omit({ commandId: true, scopeId: true })
	.strict();

const revokeGrantBodySchema = revokeGrantCommandSchema
	.omit({ commandId: true, grantId: true })
	.partial()
	.strict();

export function toGrantDto(grant: Grant) {
	return {
		id: grant.id,
		scopeId: grant.scopeId,
		granteePrincipalId: grant.granteePrincipalId,
		capability: grant.capability,
		status: grant.status,
		validFrom: grant.validFrom.toISOString(),
		validUntil: grant.validUntil?.toISOString() ?? null,
		authorityEpochAtIssue: grant.authorityEpochAtIssue,
		revision: grant.revision,
	};
}

export async function handleListGrants(
	deps: GovernancePluginDeps,
	input: { agencyId: string; principalId: string },
) {
	const grants = await listEffectiveGrants(
		{ grantRepository: deps.grantRepository },
		{ scopeId: input.agencyId, principalId: input.principalId },
	);
	return { grants: grants.map(toGrantDto) };
}

export async function handleIssueGrant(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		body: unknown;
	},
) {
	const body = issueGrantBodySchema.parse(input.body);
	return issueGrant(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			principalLookup: deps.principalLookup,
		},
		{
			commandId: input.commandId,
			scopeId: input.agencyId,
			...body,
		},
	);
}

export async function handleRevokeGrant(
	deps: GovernancePluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		grantId: string;
		body: unknown;
	},
) {
	const grant = await deps.grantRepository.findById(input.grantId);
	if (!grant || grant.scopeId !== input.agencyId) {
		throw new GovernanceCommandError(
			"GOV_GRANT_NOT_FOUND",
			`Grant ${input.grantId} not found in agency ${input.agencyId}`,
		);
	}
	const body = revokeGrantBodySchema.parse(input.body ?? {});
	return revokeGrant(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			grantRepository: deps.grantRepository,
		},
		{
			commandId: input.commandId,
			grantId: input.grantId,
			...body,
		},
	);
}

export const agencyIdParamSchema = z.object({
	agencyId: z.string().uuid(),
});

export const grantIdParamSchema = z.object({
	grantId: z.string().uuid(),
});
