import {
	type AgencyDto,
	agencyDtoSchema,
	type MembershipDto,
	membershipDtoSchema,
} from "@anxionos/contracts/organizations";
import type { Agency } from "../domain/entities/agency";
import type { Membership } from "../domain/entities/membership";

export function toAgencyDto(agency: Agency): AgencyDto {
	return agencyDtoSchema.parse({
		id: agency.id,
		ownerPrincipalId: agency.ownerPrincipalId,
		displayName: agency.displayName,
		marketScope: agency.marketScope,
		status: agency.status,
		onboardingStep: agency.onboardingStep,
		revision: agency.revision,
		createdAt: agency.createdAt.toISOString(),
		updatedAt: agency.updatedAt.toISOString(),
	});
}

export function toMembershipDto(membership: Membership): MembershipDto {
	return membershipDtoSchema.parse({
		id: membership.id,
		agencyId: membership.agencyId,
		principalId: membership.principalId,
		role: membership.role,
		status: membership.status,
		invitedAt: membership.invitedAt?.toISOString(),
		joinedAt: membership.joinedAt?.toISOString(),
		revokedAt: membership.revokedAt?.toISOString(),
		revision: membership.revision,
	});
}
