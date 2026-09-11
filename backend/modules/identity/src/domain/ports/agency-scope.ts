/**
 * R03: agency scope is resolved through `organizations` — identity never stores
 * an agency foreign key. A principal is global (D-IDN-023); tenancy comes from
 * Membership, so authorization at the HTTP boundary asks this port.
 */
export interface AgencyScopePort {
	isMember(agencyId: string, principalId: string): Promise<boolean>;
	listAgencyIdsForPrincipal(principalId: string): Promise<string[]>;
}
