import {
	createAgencyCommandSchema,
	marketScopeSchema,
	updateAgencyMarketsCommandSchema,
} from "@anxionos/contracts/organizations";
import {
	createAgency,
	getAgencyById,
	listAgenciesForPrincipal,
	updateAgencyMarkets,
} from "@anxionos/organizations";
import { z } from "zod";
import { runAgencyScopedRead } from "../../middleware/resolve-tenant-context";
import type { OrganizationsPluginDeps } from "../plugin";

const createAgencyBodySchema = createAgencyCommandSchema
	.omit({ commandId: true })
	.strict();
const updateMarketsBodySchema = z
	.object({ marketScope: marketScopeSchema })
	.strict();

export async function handleCreateAgency(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = createAgencyBodySchema.parse(input.body);
	return createAgency(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			principalLookup: deps.principalLookup,
		},
		{
			commandId: input.commandId,
			displayName: body.displayName,
			marketScope: body.marketScope,
			ownerPrincipalId: input.principalId,
		},
	);
}

export async function handleListAgencies(
	deps: OrganizationsPluginDeps,
	principalId: string,
) {
	return listAgenciesForPrincipal(
		{
			agencyRepository: deps.agencyRepository,
			membershipRepository: deps.membershipRepository,
		},
		{ principalId },
	);
}

export async function handleGetAgency(
	deps: OrganizationsPluginDeps,
	input: { agencyId: string; principalId: string },
) {
	return runAgencyScopedRead(
		deps.scopedPool,
		input.agencyId,
		input.principalId,
		(repos) =>
			getAgencyById(repos, {
				agencyId: input.agencyId,
				actorPrincipalId: input.principalId,
			}),
	);
}

export async function handleUpdateAgencyMarkets(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = updateMarketsBodySchema.parse(input.body);
	const command = updateAgencyMarketsCommandSchema.parse({
		commandId: input.commandId,
		agencyId: input.agencyId,
		marketScope: body.marketScope,
	});
	return updateAgencyMarkets(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			...command,
			actorPrincipalId: input.principalId,
		},
	);
}
