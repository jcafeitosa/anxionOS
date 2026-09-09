import { z } from "zod";
import { fillSideSchema, portfolioIdSchema, portfoliosExecutionModeSchema, positionIdSchema, positionSideSchema, } from "./types";
export const PORTFOLIOS_EVENT_TYPES = {
    PORTFOLIO_CREATED: "portfolios.portfolio.created.v1",
    POSITION_UPDATED: "portfolios.position.updated.v1",
};
export const portfolioCreatedPayloadSchema = z.object({
    portfolioId: portfolioIdSchema,
    organizationId: z.string().uuid(),
    ownerUserId: z.string().uuid(),
    capitalAccountId: z.string().min(1),
    name: z.string().min(1).max(128),
    baseCurrency: z.string().min(3).max(8),
    executionMode: portfoliosExecutionModeSchema,
});
export const positionUpdatedPayloadSchema = z.object({
    portfolioId: portfolioIdSchema,
    positionId: positionIdSchema,
    organizationId: z.string().uuid(),
    instrumentId: z.string().uuid(),
    positionSide: positionSideSchema,
    book: z.string().min(1).max(32),
    quantity: z.string(),
    revision: z.number().int().nonnegative(),
    fillId: z.string().min(1).max(128),
    side: fillSideSchema,
});
export const portfoliosEventPayloadSchema = z.discriminatedUnion("eventType", [
    z.object({
        eventType: z.literal(PORTFOLIOS_EVENT_TYPES.PORTFOLIO_CREATED),
        payload: portfolioCreatedPayloadSchema,
    }),
    z.object({
        eventType: z.literal(PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED),
        payload: positionUpdatedPayloadSchema,
    }),
]);

export type PortfoliosEventType = (typeof PORTFOLIOS_EVENT_TYPES)[keyof typeof PORTFOLIOS_EVENT_TYPES];
