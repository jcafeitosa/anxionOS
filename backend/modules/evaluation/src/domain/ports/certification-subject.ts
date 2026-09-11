export interface StrategyVersionCertificationSubject {
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	lifecycleState: string;
}

/** Cross-module read port: strategies owns subject lifecycle (G3-EVL-02). */
export interface CertificationSubjectQueryPort {
	findStrategyVersionSubject(input: {
		organizationId: string;
		strategyId: string;
		strategyVersionId: string;
	}): Promise<StrategyVersionCertificationSubject | null>;
}
