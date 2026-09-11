import type { MembershipRole } from "@anxionos/contracts/organizations";
import type { Membership } from "../../domain/entities/membership";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { throwOrganizationError } from "../errors";

/** Roles allowed to invoke agency-scoped mutation commands (POST/PATCH/DELETE). */
export const AGENCY_MUTATION_ROLES: readonly MembershipRole[] = [
	"owner",
	"admin",
	"operator",
];

export async function assertActorCanMutate(
	membershipRepository: MembershipRepository,
	actorPrincipalId: string,
	agencyId: string,
): Promise<Membership> {
	const membership = await membershipRepository.findByAgencyAndPrincipal(
		agencyId,
		actorPrincipalId,
	);
	if (!membership || membership.status !== "active") {
		throwOrganizationError(
			"ORG_CROSS_TENANT",
			`Principal ${actorPrincipalId} lacks active membership in agency ${agencyId}`,
		);
	}
	if (!AGENCY_MUTATION_ROLES.includes(membership.role)) {
		throwOrganizationError(
			"ORG_CROSS_TENANT",
			`Principal ${actorPrincipalId} lacks mutation role in agency ${agencyId}`,
		);
	}
	return membership;
}

export async function assertActorIsOwnerOrAdmin(
	membershipRepository: MembershipRepository,
	actorPrincipalId: string,
	agencyId: string,
): Promise<Membership> {
	const membership = await membershipRepository.findByAgencyAndPrincipal(
		agencyId,
		actorPrincipalId,
	);
	if (!membership || membership.status !== "active") {
		throwOrganizationError(
			"ORG_CROSS_TENANT",
			`Principal ${actorPrincipalId} lacks active membership in agency ${agencyId}`,
		);
	}
	if (membership.role !== "owner" && membership.role !== "admin") {
		throwOrganizationError(
			"ORG_CROSS_TENANT",
			`Principal ${actorPrincipalId} lacks owner/admin role in agency ${agencyId}`,
		);
	}
	return membership;
}
