import { z } from "zod";
import {
	assetClassSchema,
	executionModeSchema,
	orderSideSchema,
	orderTypeSchema,
} from "./types";
/** Immutable trade intent (P02-03 / ANX-48). Owner: decisions module. */
export const tradeIntentSchema = z.object({
	intentId: z.string().uuid(),
	actorPrincipalId: z.string().uuid(),
	agencyId: z.string().uuid(),
	tenantId: z.string().uuid().optional(),
	assetClass: assetClassSchema,
	instrumentId: z.string().uuid(),
	venue: z.string().min(1),
	accountId: z.string().uuid(),
	executionMode: executionModeSchema,
	side: orderSideSchema,
	quantity: z.string().regex(/^\d+(\.\d+)?$/),
	orderType: orderTypeSchema,
	limitPrice: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	maxSlippageBps: z.number().int().nonnegative().optional(),
	quoteCurrency: z.string().length(3),
	strategyVersionId: z.string().uuid().optional(),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	intentHash: z.string().min(1),
	idempotencyKey: z.string().uuid(),
	expiresAt: z.string().datetime(),
	createdAt: z.string().datetime(),
});
export function parseTradeIntent(input: unknown): TradeIntent {
	return tradeIntentSchema.parse(input);
}

export type TradeIntent = z.infer<typeof tradeIntentSchema>;
