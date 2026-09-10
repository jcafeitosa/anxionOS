export interface AuthorityEpochRecord {
	tenantId: string;
	agencyId: string;
	scopeId: string;
	epoch: number;
	updatedAt: Date;
}

export interface AuthorityEpochStore {
	get(scopeId: string): Promise<AuthorityEpochRecord>;
	increment(
		scopeId: string,
		tenantId: string,
		agencyId: string,
	): Promise<AuthorityEpochRecord>;
}
