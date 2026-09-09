import type { NewPrincipal, Principal } from "../entities/principal";

export interface PrincipalRepository {
	findById(id: string): Promise<Principal | null>;
	findByAuthUserId(authUserId: string): Promise<Principal | null>;
	findByEmail(email: string): Promise<Principal | null>;
	create(input: NewPrincipal): Promise<Principal>;
}
