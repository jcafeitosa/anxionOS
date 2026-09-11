export interface CapitalAccountRef {
	accountId: string;
	organizationId: string;
	ownerUserId: string;
	baseCurrency: string;
	status: string;
}

export interface CapitalQueryPort {
	findAccountById(
		organizationId: string,
		accountId: string,
	): Promise<CapitalAccountRef | null>;
}
