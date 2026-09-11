/** Cross-module read port: published scoring policy lookup (EVL_POLICY_MISSING). */
export interface ScoringPolicyQueryPort {
	isPublishedPolicyHash(input: {
		organizationId: string;
		policyHash: string;
	}): Promise<boolean>;
}
