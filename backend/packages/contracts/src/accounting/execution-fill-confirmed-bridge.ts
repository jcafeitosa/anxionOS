import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	accountingExecutionModeSchema,
	decimalAmountSchema,
	orderSideSchema,
} from "./types";
/** Bridge schema for accounting consumer input shaped as execution.fill.confirmed.v1 (SIMULATED fixture). */
export const executionFillConfirmedV1Schema = z.object({
	eventId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	fillId: z.string().min(1).max(128),
	orderId: institutionalUuidSchema,
	executionSessionId: institutionalUuidSchema.optional(),
	side: orderSideSchema,
	instrumentId: institutionalUuidSchema,
	quantity: decimalAmountSchema,
	price: decimalAmountSchema,
	notionalAmount: decimalAmountSchema,
	asset: z.string().min(1).max(16),
	filledAt: z.string().datetime(),
	executionMode: accountingExecutionModeSchema,
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
	feeAmount: decimalAmountSchema.optional(),
	feeCurrency: z.string().optional(),
});
export function mapFillConfirmedToPostTradeFill(
	fill: ExecutionFillConfirmedV1,
	commandId: string,
): PostTradeFillFromFillInput {
	const parsed = executionFillConfirmedV1Schema.parse(fill);
	return {
		commandId,
		organizationId: parsed.organizationId,
		fillId: parsed.fillId,
		orderId: parsed.orderId,
		side: parsed.side,
		asset: parsed.asset,
		notionalAmount: parsed.notionalAmount,
		executionMode: parsed.executionMode,
		idempotencyKey: `fill:${parsed.fillId}`,
		capitalAccountId: parsed.capitalAccountId,
		portfolioId: parsed.portfolioId,
		valueDate: parsed.filledAt.slice(0, 10),
	};
}

export type ExecutionFillConfirmedV1 = z.infer<
	typeof executionFillConfirmedV1Schema
>;
export interface PostTradeFillFromFillInput {
	commandId: string;
	organizationId: string;
	fillId: string;
	orderId: string;
	side: ExecutionFillConfirmedV1["side"];
	asset: string;
	notionalAmount: string;
	executionMode: ExecutionFillConfirmedV1["executionMode"];
	idempotencyKey: string;
	capitalAccountId?: string;
	portfolioId?: string;
	valueDate?: string;
}
