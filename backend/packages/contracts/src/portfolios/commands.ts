import { z } from "zod";
import {
	decimalAmountSchema,
	fillSideSchema,
	holdingIdSchema,
	portfolioIdSchema,
	portfoliosExecutionModeSchema,
	positionIdSchema,
} from "./types";
export const portfoliosCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	portfolioId: portfolioIdSchema.optional(),
	positionId: positionIdSchema.optional(),
	holdingId: holdingIdSchema.optional(),
});
export const createPortfolioCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	ownerUserId: z.string().uuid(),
	capitalAccountId: z.string().min(1),
	name: z.string().min(1).max(128),
	baseCurrency: z.string().min(3).max(8),
	executionMode: portfoliosExecutionModeSchema,
});
export const applyFillToPositionCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	portfolioId: portfolioIdSchema,
	fillId: z.string().min(1).max(128),
	instrumentId: z.string().uuid(),
	side: fillSideSchema,
	quantity: decimalAmountSchema,
	price: decimalAmountSchema,
	executionMode: portfoliosExecutionModeSchema,
	idempotencyKey: z.string().min(1).max(128),
});

export type PortfoliosCommandResult = z.infer<
	typeof portfoliosCommandResultSchema
>;

export type CreatePortfolioCommand = z.infer<
	typeof createPortfolioCommandSchema
>;

export type ApplyFillToPositionCommand = z.infer<
	typeof applyFillToPositionCommandSchema
>;
