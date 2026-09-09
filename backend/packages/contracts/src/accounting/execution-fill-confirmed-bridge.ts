import { z } from "zod";
import { accountingExecutionModeSchema, decimalAmountSchema, orderSideSchema } from "./types";
/** Bridge schema for accounting consumer input shaped as execution.fill.confirmed.v1 (SIMULATED fixture). */
export const executionFillConfirmedV1Schema = z.object({
    eventId: z.string().uuid(),
    organizationId: z.string().uuid(),
    fillId: z.string().min(1).max(128),
    orderId: z.string().uuid(),
    executionSessionId: z.string().uuid().optional(),
    side: orderSideSchema,
    instrumentId: z.string().uuid(),
    quantity: decimalAmountSchema,
    price: decimalAmountSchema,
    notionalAmount: decimalAmountSchema,
    asset: z.string().min(1).max(16),
    filledAt: z.string().datetime(),
    executionMode: accountingExecutionModeSchema,
    capitalAccountId: z.string().optional(),
    portfolioId: z.string().uuid().optional(),
    feeAmount: decimalAmountSchema.optional(),
    feeCurrency: z.string().optional(),
});
export function mapFillConfirmedToPostTradeFill(fill: ExecutionFillConfirmedV1, commandId: string): PostTradeFillFromFillInput {
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

export type ExecutionFillConfirmedV1 = z.infer<typeof executionFillConfirmedV1Schema>;
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
