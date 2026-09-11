export class AgencyScopeViolationError extends Error {
	principalId: string;
	agencyId: string;

	constructor(principalId: string, agencyId: string) {
		super(
			`Principal ${principalId} lacks active membership in agency ${agencyId}`,
		);
		this.principalId = principalId;
		this.agencyId = agencyId;
		this.name = "AgencyScopeViolationError";
	}
}

export interface AgencyScopeGuard {
	assertAgencyScope(principalId: string, agencyId: string): Promise<void>;
	hasActiveMembership(principalId: string, agencyId: string): Promise<boolean>;
}
