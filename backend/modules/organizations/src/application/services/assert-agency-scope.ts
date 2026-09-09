import type { MembershipRepository } from "../../domain/ports/membership-repository";
import { throwOrganizationError } from "../errors";

export async function assertAgencyScope(
	membershipRepository: MembershipRepository,
	principalId: string,
	agencyId: string,
): Promise<void> {
	const membership = await membershipRepository.findByAgencyAndPrincipal(agencyId, principalId);
    if (!membership || membership.status !== "active") {
        throwOrganizationError("ORG_CROSS_TENANT", `Principal ${principalId} lacks active membership in agency ${agencyId}`);
    }
}
