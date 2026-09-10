import type { Grant } from "../entities/grant";

export interface GrantRepository {
	save(grant: Grant): Promise<Grant>;
	findById(grantId: string): Promise<Grant | null>;
	listEffective(scopeId: string, principalId: string): Promise<Grant[]>;
	listEffectiveForAgent(
		scopeId: string,
		subjectAgentId: string,
	): Promise<Grant[]>;
	findActiveByDerivedFromMembershipId(membershipId: string): Promise<Grant[]>;
}
