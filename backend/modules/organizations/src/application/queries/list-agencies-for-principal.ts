import type { AgencyDto } from "@anxionos/contracts/organizations";
import type { AgencyRepository } from "../../domain/ports/agency-repository";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { toAgencyDto } from "../query-support";

export async function listAgenciesForPrincipal(
	deps: ListAgenciesForPrincipalDeps,
	input: ListAgenciesForPrincipalInput,
): Promise<AgencyDto[]> {
	const memberships = await deps.membershipRepository.listActiveByPrincipal(
		input.principalId,
	);
	const agencies: AgencyDto[] = [];
	for (const membership of memberships) {
		const agency = await deps.agencyRepository.findByAgencyId(
			membership.agencyId,
		);
		if (agency) {
			agencies.push(toAgencyDto(agency));
		}
	}
	return agencies;
}

export interface ListAgenciesForPrincipalInput {
	principalId: string;
}

export interface ListAgenciesForPrincipalDeps {
	agencyRepository: AgencyRepository;
	membershipRepository: MembershipRepository;
}
