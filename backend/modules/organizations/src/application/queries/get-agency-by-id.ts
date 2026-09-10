import type { AgencyDto } from "@anxionos/contracts/organizations";
import type { AgencyRepository } from "../../domain/ports/agency-repository";
import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { throwOrganizationError } from "../errors";
import { toAgencyDto } from "../query-support";
import { assertAgencyScope } from "../services/assert-agency-scope";

export async function getAgencyById(
	deps: GetAgencyByIdDeps,
	input: GetAgencyByIdInput,
): Promise<AgencyDto> {
	await assertAgencyScope(
		deps.membershipRepository,
		input.actorPrincipalId,
		input.agencyId,
	);
	const agency = await deps.agencyRepository.findByAgencyId(input.agencyId);
	if (!agency) {
		throwOrganizationError(
			"ORG_AGENCY_NOT_FOUND",
			`Agency ${input.agencyId} not found`,
		);
	}
	return toAgencyDto(agency);
}

export interface GetAgencyByIdInput {
	agencyId: string;
	actorPrincipalId: string;
}

export interface GetAgencyByIdDeps {
	agencyRepository: AgencyRepository;
	membershipRepository: MembershipRepository;
}
