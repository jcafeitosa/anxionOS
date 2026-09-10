import type { PrincipalLookup } from "../../domain/ports/principal-lookup";

export interface FixturePrincipalLookupConfig {
	ownersByOrganization: Map<string, Set<string>>;
	existingPrincipals?: Set<string>;
}

export function createFixturePrincipalLookup(
	config: FixturePrincipalLookupConfig,
): PrincipalLookup {
	return {
		async exists(principalId) {
			if (config.existingPrincipals) {
				return config.existingPrincipals.has(principalId);
			}
			return true;
		},
		async isOwnerPrincipal(principalId, organizationId) {
			const owners = config.ownersByOrganization.get(organizationId);
			return owners?.has(principalId) ?? false;
		},
	};
}
