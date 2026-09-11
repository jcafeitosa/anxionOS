/**
 * R03: `kind` is immutable after insert; `revision` is the optimistic
 * concurrency token. REVOKED is terminal — reactivation is rejected.
 */
export type PrincipalStatus = "active" | "suspended" | "revoked";
export type PrincipalKind = "human" | "service";

export interface Principal {
	id: string;
	/**
	 * Better Auth user id. `null` for service principals, which authenticate
	 * with credentials owned by this module and never hold a human session.
	 */
	authUserId: string | null;
	email: string;
	kind: PrincipalKind;
	status: PrincipalStatus;
	revision: number;
	createdAt: Date;
	suspendedAt: Date | null;
	suspensionReason: string | null;
	revokedAt: Date | null;
	revocationReason: string | null;
}

export interface NewPrincipal {
	authUserId?: string | null;
	email: string;
	kind?: PrincipalKind;
}

/** Optimistic concurrency — `undefined` means "do not check". */
export interface ExpectedRevision {
	expectedRevision?: number;
}
