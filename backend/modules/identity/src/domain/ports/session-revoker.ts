/**
 * R03: SessionRevocationPort invalidates sessions derived from a principal
 * (suspended/revoked) in the authentication layer that owns them.
 *
 * The adapter never returns raw session identifiers across this boundary: it
 * returns the hash of its own opaque reference plus the revocation timestamp,
 * so the module can record `SessionRef` rows without ever handling a token.
 */
export interface RevokedSessionRef {
	externalRefHash: string;
	revokedAt: Date;
}

export interface SessionRevocationPort {
	revokeAllForAuthUser(authUserId: string): Promise<RevokedSessionRef[]>;
}

/** Back-compat alias for the P1 name. */
export type SessionRevoker = SessionRevocationPort;

export class SessionRevocationUnavailableError extends Error {
	constructor(
		message = "Session revocation unavailable",
		options?: { cause?: unknown },
	) {
		super(message, options);
		this.name = "SessionRevocationUnavailableError";
	}
}
