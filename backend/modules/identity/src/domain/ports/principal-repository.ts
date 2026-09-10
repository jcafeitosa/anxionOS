import type { NewPrincipal, Principal } from "../entities/principal";

export interface PrincipalRepository {
	findById(id: string): Promise<Principal | null>;
	findByAuthUserId(authUserId: string): Promise<Principal | null>;
	findByEmail(email: string): Promise<Principal | null>;
	listSuspended(): Promise<Principal[]>;
	create(input: NewPrincipal): Promise<Principal>;
	markSuspended(
		id: string,
		reasonCode: string,
		suspendedAt: Date,
	): Promise<Principal | null>;
	reactivate(id: string): Promise<Principal | null>;
	updateEmail(id: string, email: string): Promise<Principal | null>;
	linkAuthUserId(id: string, authUserId: string): Promise<Principal | null>;
}
