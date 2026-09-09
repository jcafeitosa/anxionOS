export interface AuthorityEpochRecord {
	scopeId: string;
	epoch: number;
	updatedAt: Date;
}

export interface AuthorityEpochStore {
	get(scopeId: string): Promise<AuthorityEpochRecord>;
	increment(scopeId: string): Promise<AuthorityEpochRecord>;
}
