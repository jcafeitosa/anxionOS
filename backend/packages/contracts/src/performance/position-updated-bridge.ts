import type { z } from "zod";
import { positionUpdatedPayloadSchema } from "../portfolios/events";

/** Bridge schema for performance consumer input shaped as portfolios.position.updated.v1. */
export const portfoliosPositionUpdatedBridgeSchema =
	positionUpdatedPayloadSchema;

export type PortfoliosPositionUpdatedBridge = z.infer<
	typeof portfoliosPositionUpdatedBridgeSchema
>;

export interface RecordPositionExposureFromEventInput {
	commandId: string;
	organizationId: string;
	portfolioId: string;
	positionId: string;
	revision: number;
	instrumentId: string;
	positionSide: PortfoliosPositionUpdatedBridge["positionSide"];
	book: string;
	quantity: string;
	fillId: string;
	side: PortfoliosPositionUpdatedBridge["side"];
	provisionalCash?: boolean;
}

export function mapPositionUpdatedToPerformanceInput(
	position: PortfoliosPositionUpdatedBridge,
	commandId: string,
): RecordPositionExposureFromEventInput {
	const parsed = portfoliosPositionUpdatedBridgeSchema.parse(position);
	return {
		commandId,
		organizationId: parsed.organizationId,
		portfolioId: parsed.portfolioId,
		positionId: parsed.positionId,
		revision: parsed.revision,
		instrumentId: parsed.instrumentId,
		positionSide: parsed.positionSide,
		book: parsed.book,
		quantity: parsed.quantity,
		fillId: parsed.fillId,
		side: parsed.side,
		provisionalCash: parsed.provisionalCash,
	};
}
