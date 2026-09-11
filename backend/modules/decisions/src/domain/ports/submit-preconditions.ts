export interface SubmitPreconditionsRecord {
	decisionId: string;
	organizationId: string;
	intentHash: string;
	riskCheckId?: string;
	riskCheckResult?: string;
	capitalReservationId?: string;
	riskEventId?: string;
	capitalEventId?: string;
}

export interface SubmitPreconditionsRepository {
	findByDecisionId(
		decisionId: string,
	): Promise<SubmitPreconditionsRecord | null>;
	findByOrganizationAndIntentHash(
		organizationId: string,
		intentHash: string,
	): Promise<SubmitPreconditionsRecord | null>;
	findByRiskEventId(eventId: string): Promise<SubmitPreconditionsRecord | null>;
	findByCapitalEventId(
		eventId: string,
	): Promise<SubmitPreconditionsRecord | null>;
	save(record: SubmitPreconditionsRecord): Promise<SubmitPreconditionsRecord>;
	updateRiskCheck(
		decisionId: string,
		input: {
			riskCheckId: string;
			riskCheckResult: string;
			riskEventId: string;
		},
	): Promise<SubmitPreconditionsRecord>;
	updateCapitalReservation(
		decisionId: string,
		input: {
			capitalReservationId: string;
			capitalEventId: string;
		},
	): Promise<SubmitPreconditionsRecord>;
	invalidateRiskPassForOrganization(organizationId: string): Promise<string[]>;
}
