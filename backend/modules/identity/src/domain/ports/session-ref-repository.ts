import type { NewSessionRef, SessionRef } from "../entities/session-ref";

export interface SessionRefRepository {
	findById(id: string): Promise<SessionRef | null>;
	findByExternalRefHash(externalRefHash: string): Promise<SessionRef | null>;
	listByPrincipalId(principalId: string): Promise<SessionRef[]>;
	/** Revocation audit trail — newest first, optionally bounded by a window. */
	listRevoked(since?: Date): Promise<SessionRef[]>;
	create(input: NewSessionRef): Promise<SessionRef>;
	/**
	 * Records a revocation learned from the session owner (the reference may be
	 * unknown to this module yet). Idempotent by `externalRefHash`.
	 */
	recordRevoked(input: {
		id?: string;
		principalId: string;
		externalRefHash: string;
		revokedAt: Date;
		reasonCode?: string | null;
	}): Promise<SessionRef>;
	revoke(
		id: string,
		revokedAt: Date,
		reasonCode?: string | null,
	): Promise<SessionRef | null>;
}
