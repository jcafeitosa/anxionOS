export interface PrincipalLookup {
    exists(principalId: string): Promise<boolean>;
    isOwnerPrincipal(principalId: string, organizationId: string): Promise<boolean>;
}

export class PrincipalLookupUnavailableError extends Error {
    constructor(message = "Identity service unavailable", options) {
        super(message, options);
        this.name = "PrincipalLookupUnavailableError";
    }
}
