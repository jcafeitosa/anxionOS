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
	if (!membership?.inviteEmail) {
		throw new OrganizationCommandError(
			"ORG_AGENCY_NOT_FOUND",
			`Membership ${input.membershipId} not found in agency ${input.agencyId}`,
		);
	}
	const targetPrincipal = await deps.identityRepository.findByEmail(
		membership.inviteEmail,
	);
	if (!targetPrincipal) {
		throw new OrganizationCommandError(
			"ORG_PRINCIPAL_NOT_FOUND",
			`No principal registered for invite email ${membership.inviteEmail}`,
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
			principalLookup: deps.principalLookup,
		},
		{
			...command,
			actorPrincipalId: input.principalId,
			targetPrincipalId: targetPrincipal.id,
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
