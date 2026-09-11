import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	assetClassSchema,
	executionModeSchema,
	orderSideSchema,
	orderTypeSchema,
} from "./types";
/** Immutable trade intent (P02-03 / ANX-48). Owner: decisions module. */
export const tradeIntentSchema = z.object({
	intentId: institutionalUuidSchema,
	actorPrincipalId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	tenantId: institutionalUuidSchema.optional(),
	assetClass: assetClassSchema,
	instrumentId: institutionalUuidSchema,
	venue: z.string().min(1),
	accountId: institutionalUuidSchema,
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
	strategyVersionId: institutionalUuidSchema.optional(),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	intentHash: z.string().min(1),
	idempotencyKey: institutionalUuidSchema,
	expiresAt: z.string().datetime(),
	createdAt: z.string().datetime(),
});
export function parseTradeIntent(input: unknown): TradeIntent {
	return tradeIntentSchema.parse(input);
}

export type TradeIntent = z.infer<typeof tradeIntentSchema>;
