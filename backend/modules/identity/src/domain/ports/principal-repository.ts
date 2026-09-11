import type { NewPrincipal, Principal } from "../entities/principal";

/**
 * Every mutating method increments `revision` by one and returns `null` when
 * no row matched — either the principal does not exist, the requested
 * transition is invalid for the current status, or `expectedRevision` did not
 * match. The application layer re-reads the row to classify the failure.
 */
export interface PrincipalRepository {
	findById(id: string): Promise<Principal | null>;
	findByAuthUserId(authUserId: string): Promise<Principal | null>;
	findByEmail(email: string): Promise<Principal | null>;
	listSuspended(): Promise<Principal[]>;
	listAll(): Promise<Principal[]>;
	create(input: NewPrincipal): Promise<Principal>;
	/**
	 * Insert that tolerates a concurrent winner for the same unique key:
	 * `ON CONFLICT DO NOTHING`, so the transaction is NOT aborted by 23505 and
	 * the caller can resolve the race by re-reading. `null` = a conflicting row
	 * exists (it has committed by the time this returns).
	 */
	createIfAbsent(input: NewPrincipal): Promise<Principal | null>;
	markSuspended(
		id: string,
		reasonCode: string,
		suspendedAt: Date,
		expectedRevision?: number,
	): Promise<Principal | null>;
	reactivate(id: string, expectedRevision?: number): Promise<Principal | null>;
	revoke(
		id: string,
		reasonCode: string,
		revokedAt: Date,
		expectedRevision?: number,
	): Promise<Principal | null>;
	updateEmail(id: string, email: string): Promise<Principal | null>;
	linkAuthUserId(id: string, authUserId: string): Promise<Principal | null>;
}
