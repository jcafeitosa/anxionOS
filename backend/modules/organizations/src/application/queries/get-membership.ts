import type { MembershipDto } from "@anxionos/contracts/organizations";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { throwOrganizationError } from "../errors";
import { toMembershipDto } from "../query-support";
import { assertAgencyScope } from "../services/assert-agency-scope";

export async function getMembership(
	deps: GetMembershipDeps,
	input: GetMembershipInput,
): Promise<MembershipDto> {
	await assertAgencyScope(
		deps.membershipRepository,
		input.actorPrincipalId,
		input.agencyId,
	);
	const membership = await deps.membershipRepository.findById(
		input.agencyId,
		input.membershipId,
	);
	if (!membership) {
		throwOrganizationError(
			"ORG_AGENCY_NOT_FOUND",
			`Membership ${input.membershipId} not found in agency ${input.agencyId}`,
		);
	}
	return toMembershipDto(membership);
}

export interface GetMembershipInput {
	agencyId: string;
	membershipId: string;
	actorPrincipalId: string;
}

export interface GetMembershipDeps {
	membershipRepository: MembershipRepository;
}
