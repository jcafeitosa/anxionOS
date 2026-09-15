export interface PrincipalLookup {
	exists(principalId: string): Promise<boolean>;
	isOwnerPrincipal(
		principalId: string,
		organizationId: string,
	): Promise<boolean>;
}

export { PrincipalLookupUnavailableError } from "@anxionos/contracts/identity";
