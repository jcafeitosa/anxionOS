import type { Owner } from "../entities/owner";

export interface OwnerRepository {
	save(owner: Owner): Promise<Owner>;
	findByPrincipalId(principalId: string): Promise<Owner | null>;
}
