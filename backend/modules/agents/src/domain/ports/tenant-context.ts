export interface TenantContext {
	readonly tenantId: string;
	readonly agencyId?: string;
	readonly principalId?: string;
	readonly bypassRls?: boolean;
}
