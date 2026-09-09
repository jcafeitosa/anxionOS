export interface SimulatedFillRequest {
	orderId: string;
	clientOrderId: string;
	quantity: string;
	price: string;
	asset: string;
}

export interface SimulatedFillResult {
	venueFillId: string;
	quantity: string;
	price: string;
	notionalAmount: string;
	asset: string;
	filledAt: string;
}

/** Port for simulated venue fills (SIMULATED slice). */
export interface SimulatedVenuePort {
	fill(
		request: SimulatedFillRequest,
		notionalAmount: string,
	): SimulatedFillResult;
}
