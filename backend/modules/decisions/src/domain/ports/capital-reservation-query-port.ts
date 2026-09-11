export interface HeldCapitalReservation {
	reservationId: string;
	organizationId: string;
	intentHash: string;
}

export interface CapitalReservationQueryPort {
	findHeldByIntentHash(
		organizationId: string,
		intentHash: string,
	): Promise<HeldCapitalReservation | null>;
}
