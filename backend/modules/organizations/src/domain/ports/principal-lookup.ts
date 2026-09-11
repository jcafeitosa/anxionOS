export class PrincipalLookupUnavailableError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "PrincipalLookupUnavailableError";
	}
}

export interface PrincipalLookup {
	/** True when an active Principal exists; false for missing or suspended. */
	exists(principalId: string): Promise<boolean>;
}
