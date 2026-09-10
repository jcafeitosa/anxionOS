import type { MembershipDto } from "@anxionos/contracts/organizations";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { toMembershipDto } from "../query-support";
import { assertAgencyScope } from "../services/assert-agency-scope";

export async function listMembershipsByAgency(
	deps: ListMembershipsByAgencyDeps,
	input: ListMembershipsByAgencyInput,
): Promise<MembershipDto[]> {
	await assertAgencyScope(
		deps.membershipRepository,
		input.actorPrincipalId,
		input.agencyId,
	);
	const memberships = await deps.membershipRepository.listByAgency(
		input.agencyId,
	);
	return memberships.map(toMembershipDto);
}

export interface ListMembershipsByAgencyInput {
	agencyId: string;
	actorPrincipalId: string;
}

export interface ListMembershipsByAgencyDeps {
	membershipRepository: MembershipRepository;
}
