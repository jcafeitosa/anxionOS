/** Operational budget port — wakeup unit consumption per organization (R02 budget pre-check). */
export interface OperationalBudgetPort {
	/**
	 * Reserves one wakeup unit for the organization.
	 * @returns false when the operational budget cap is exceeded.
	 */
	reserveWakeupUnit(organizationId: string): Promise<boolean>;
	/** Returns remaining wakeup units for the organization (best-effort). */
	remainingWakeupUnits(organizationId: string): Promise<number>;
}
