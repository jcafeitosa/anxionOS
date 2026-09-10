import type { z } from "zod";
import {
	type ExecutionFillConfirmedV1,
	executionFillConfirmedV1Schema,
} from "../accounting/execution-fill-confirmed-bridge";
import { PortfoliosContractError, portfolioIdSchema } from "./types";
export { executionFillConfirmedV1Schema };
/** Portfolios-aware fill schema: portfolio ids use pf_prt_* instead of raw UUID. */
export const portfoliosExecutionFillConfirmedV1Schema =
	executionFillConfirmedV1Schema
		.omit({ portfolioId: true })
		.extend({ portfolioId: portfolioIdSchema.optional() });
export function mapFillConfirmedToApplyFill(
	fill: ExecutionFillConfirmedV1 | PortfoliosExecutionFillConfirmedV1,
	commandId: string,
): ApplyFillFromFillInput {
	const parsed = portfoliosExecutionFillConfirmedV1Schema.parse(fill);
	if (!parsed.portfolioId) {
		throw new PortfoliosContractError("PF_PORTFOLIO_NOT_FOUND");
	}
	return {
		commandId,
		organizationId: parsed.organizationId,
		portfolioId: parsed.portfolioId,
		fillId: parsed.fillId,
		instrumentId: parsed.instrumentId,
		side: parsed.side,
		quantity: parsed.quantity,
		price: parsed.price,
		executionMode: parsed.executionMode,
		idempotencyKey: `fill:${parsed.fillId}`,
	};
}

export type PortfoliosExecutionFillConfirmedV1 = z.infer<
	typeof portfoliosExecutionFillConfirmedV1Schema
>;
export interface ApplyFillFromFillInput {
	commandId: string;
	organizationId: string;
	portfolioId: string;
	fillId: string;
	instrumentId: string;
	side: "BUY" | "SELL";
	quantity: string;
	price: string;
	executionMode: "SIMULATED" | "PAPER";
	idempotencyKey: string;
}
