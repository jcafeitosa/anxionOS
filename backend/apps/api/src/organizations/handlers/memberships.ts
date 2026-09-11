import {
	activateMembershipCommandSchema,
	inviteMemberCommandSchema,
	membershipRoleSchema,
	revokeMembershipCommandSchema,
} from "@anxionos/contracts/organizations";
import {
	activateMembership,
	getMembership,
	inviteMember,
	listMembershipsByAgency,
	OrganizationCommandError,
	revokeMembership,
} from "@anxionos/organizations";
import { z } from "zod";
import { runAgencyScopedRead } from "../../middleware/resolve-tenant-context";
import type { OrganizationsPluginDeps } from "../plugin";

const inviteMemberBodySchema = z
	.object({
		email: z.string().email(),
		role: membershipRoleSchema.exclude(["owner"]),
	})
	.strict();

export async function handleListMemberships(
	deps: OrganizationsPluginDeps,
	input: { agencyId: string; principalId: string },
) {
	return runAgencyScopedRead(
		deps.scopedPool,
		input.agencyId,
		input.principalId,
		(repos) =>
			listMembershipsByAgency(
				{ membershipRepository: repos.membershipRepository },
				{
					agencyId: input.agencyId,
					actorPrincipalId: input.principalId,
				},
			),
	);
}

export async function handleGetMembership(
	deps: OrganizationsPluginDeps,
	input: { agencyId: string; membershipId: string; principalId: string },
) {
	return runAgencyScopedRead(
		deps.scopedPool,
		input.agencyId,
		input.principalId,
		(repos) =>
			getMembership(
				{ membershipRepository: repos.membershipRepository },
				{
					agencyId: input.agencyId,
					membershipId: input.membershipId,
					actorPrincipalId: input.principalId,
				},
			),
	);
}

export async function handleInviteMember(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		principalId: string;
		body: unknown;
	},
) {
	const body = inviteMemberBodySchema.parse(input.body);
	const command = inviteMemberCommandSchema.parse({
		commandId: input.commandId,
		agencyId: input.agencyId,
		email: body.email,
		role: body.role,
	});
	const { result, inviteToken } = await inviteMember(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			inviteTokenHasher: deps.inviteTokenHasher,
		},
		{
			...command,
			actorPrincipalId: input.principalId,
		},
	);
	return { ...result, inviteToken: inviteToken || undefined };
}

export async function handleActivateMembership(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		membershipId: string;
		principalId: string;
	},
) {
	const membership = await runAgencyScopedRead(
		deps.scopedPool,
		input.agencyId,
		input.principalId,
		(repos) =>
			repos.membershipRepository.findById(input.agencyId, input.membershipId),
	);
	if (!membership) {
		throw new OrganizationCommandError(
			"ORG_AGENCY_NOT_FOUND",
			`Membership ${input.membershipId} not found in agency ${input.agencyId}`,
		);
	}
	// G5-F2 — o handler NAO consulta mais `identityRepository.findByEmail` do
	// convite. Essa consulta devolvia 404 para e-mail sem principal e 200 para
	// e-mail registrado, o que (a) enumerava os e-mails da plataforma e (b)
	// vinculava o principal de um terceiro sem consentimento. O alvo agora e' o
	// principal JA' vinculado a' membership; sem vinculo previo, quem ativa e' o
	// proprio convidado via `acceptInviteByToken`. O recusso usa o mesmo codigo
	// exista ou nao principal para o e-mail, entao nao sobra oraculo.
	if (!membership.principalId) {
		throw new OrganizationCommandError(
			"ORG_INVITEE_CONSENT_REQUIRED",
			"Assisted activation cannot bind a principal for the first time; the invitee must accept the invite",
		);
	}
	const command = activateMembershipCommandSchema.parse({
		commandId: input.commandId,
		agencyId: input.agencyId,
		membershipId: input.membershipId,
	});
	return activateMembership(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			...command,
			actorPrincipalId: input.principalId,
			targetPrincipalId: membership.principalId,
		},
	);
}

export async function handleRevokeMembership(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		agencyId: string;
		membershipId: string;
		principalId: string;
	},
) {
	const command = revokeMembershipCommandSchema.parse({
		commandId: input.commandId,
		agencyId: input.agencyId,
		membershipId: input.membershipId,
	});
	return revokeMembership(
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
