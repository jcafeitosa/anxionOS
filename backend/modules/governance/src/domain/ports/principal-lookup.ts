export interface PrincipalLookup {
	exists(principalId: string): Promise<boolean>;
}

export class PrincipalLookupUnavailableError extends Error {
	constructor(
		message = "Identity service unavailable",
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "PrincipalLookupUnavailableError";
	}
}
