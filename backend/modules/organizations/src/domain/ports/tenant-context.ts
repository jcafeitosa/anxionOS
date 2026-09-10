/**
 * Domain port mirror of database tenant scope — keeps application layer off @anxionos/database (AR01).
 */
export interface TenantContext {
	readonly tenantId: string;
	readonly agencyId?: string;
	readonly principalId?: string;
	readonly bypassRls?: boolean;
}
