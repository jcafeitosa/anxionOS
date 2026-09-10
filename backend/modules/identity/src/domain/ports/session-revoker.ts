export interface SessionRevoker {
	revokeAllForAuthUser(authUserId: string): Promise<void>;
}

export class SessionRevocationUnavailableError extends Error {
	constructor(
		message = "Session revocation unavailable",
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "SessionRevocationUnavailableError";
	}
}
