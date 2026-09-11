import type { AgencyScopePort } from "@anxionos/identity";
import type { MembershipRepository } from "@anxionos/organizations";

/**
 * `AgencyScopePort` adapter: agency scope is resolved through `organizations`
 * membership. Identity stores no agency foreign key (D-IDN-023) and this
 * adapter never writes to another module's state.
 */
export function createAgencyScope(
	membershipRepository: MembershipRepository,
): AgencyScopePort {
	async function activeAgencyIds(principalId: string): Promise<string[]> {
		const memberships =
			await membershipRepository.listActiveByPrincipal(principalId);
		return [...new Set(memberships.map((membership) => membership.agencyId))];
	}

	return {
		async isMember(agencyId: string, principalId: string): Promise<boolean> {
			const agencyIds = await activeAgencyIds(principalId);
			return agencyIds.includes(agencyId);
		},
		listAgencyIdsForPrincipal: activeAgencyIds,
	};
}
