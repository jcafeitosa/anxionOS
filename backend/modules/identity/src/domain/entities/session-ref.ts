/**
 * R03: SessionRef is a **logical** reference to a session owned by the
 * authentication layer (Better Auth in `apps/api`).
 *
 * The token, cookie or raw session id never reaches this module: the caller
 * supplies a one-way hash of its own opaque reference, kept only to correlate
 * revocation records. `id` is the module's own institutional UUID.
 */
export type SessionRefStatus = "active" | "revoked";

export interface SessionRef {
	id: string;
	principalId: string;
	status: SessionRefStatus;
	externalRefHash: string;
	createdAt: Date;
	revokedAt: Date | null;
	revocationReason: string | null;
}

export interface NewSessionRef {
	/** Callers that already own the logical id (R03 `sessionRefId`) pass it in. */
	id?: string;
	principalId: string;
	externalRefHash: string;
}
