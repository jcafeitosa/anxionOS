import type {
  SimulatedFillRequest,
  SimulatedFillResult,
  SimulatedVenuePort,
} from "../../domain/ports/simulated-venue-port";

export interface SimulatedVenueAdapterOptions {
  venueFillIdGenerator?: (request: SimulatedFillRequest) => string;
}

export class SimulatedVenueAdapter implements SimulatedVenuePort {
  private readonly venueFillIdGenerator: (request: SimulatedFillRequest) => string;

  constructor(options: SimulatedVenueAdapterOptions = {}) {
    this.venueFillIdGenerator =
      options.venueFillIdGenerator ??
      ((request: SimulatedFillRequest) => `sim_vfill_${request.orderId}`);
  }

  fill(request: SimulatedFillRequest, notionalAmount: string): SimulatedFillResult {
    const venueFillId = this.venueFillIdGenerator(request);
    return {
      venueFillId,
      quantity: request.quantity,
      price: request.price,
      notionalAmount,
      asset: request.asset,
      filledAt: new Date().toISOString(),
    };
  }
}
