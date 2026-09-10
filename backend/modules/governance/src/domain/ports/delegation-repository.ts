import type { Delegation } from "../entities/delegation";

export interface DelegationRepository {
	save(delegation: Delegation): Promise<Delegation>;
	findById(delegationId: string): Promise<Delegation | null>;
}
