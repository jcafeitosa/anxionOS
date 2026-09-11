import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { positionReconciliationCaseKindSchema } from "./reconciliation-types";
import {
	fillSideSchema,
	portfolioIdSchema,
	portfoliosExecutionModeSchema,
	positionIdSchema,
	positionSideSchema,
} from "./types";
export const PORTFOLIOS_EVENT_TYPES = {
	PORTFOLIO_CREATED: "portfolios.portfolio.created.v1",
	POSITION_UPDATED: "portfolios.position.updated.v1",
	VALUATION_CONFIRMED: "portfolios.valuation.confirmed.v1",
	RECONCILIATION_OPENED: "portfolios.reconciliation.opened.v1",
	RECONCILIATION_RESOLVED: "portfolios.reconciliation.resolved.v1",
	CASH_RECONCILED: "portfolios.cash.reconciled.v1",
};
export const portfolioCreatedPayloadSchema = z.object({
	portfolioId: portfolioIdSchema,
	organizationId: institutionalUuidSchema,
	ownerUserId: institutionalUuidSchema,
	capitalAccountId: z.string().min(1),
	name: z.string().min(1).max(128),
	baseCurrency: z.string().min(3).max(8),
	executionMode: portfoliosExecutionModeSchema,
});
export const valuationConfirmedPayloadSchema = z.object({
	snapshotId: z.string().min(1),
	portfolioId: portfolioIdSchema,
	organizationId: institutionalUuidSchema,
	asOf: z.string().datetime(),
	valuationVersion: z.number().int().positive(),
	navBase: z.string(),
	baseCurrency: z.string().min(3).max(8),
	qualityFlags: z.array(z.string()),
});
export const positionUpdatedPayloadSchema = z.object({
	portfolioId: portfolioIdSchema,
	positionId: positionIdSchema,
	organizationId: institutionalUuidSchema,
	instrumentId: z.string(),
	positionSide: positionSideSchema,
	book: z.string().min(1).max(32),
	quantity: z.string(),
	revision: z.number().int().nonnegative(),
	fillId: z.string().min(1).max(128),
	side: fillSideSchema,
	provisionalCash: z.boolean().optional(),
});
export const reconciliationOpenedPayloadSchema = z.object({
	caseId: z.string().min(1),
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	caseKind: positionReconciliationCaseKindSchema,
	positionId: positionIdSchema.optional(),
	fillId: z.string().min(1).max(128).optional(),
	journalEntryId: z.string().min(1).max(128).optional(),
	evidence: z.string().optional(),
});
export const reconciliationResolvedPayloadSchema = z.object({
	caseId: z.string().min(1),
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	caseKind: positionReconciliationCaseKindSchema,
	disposition: z.string().min(1),
	rationale: z.string().min(1),
});
export const cashReconciledPayloadSchema = z.object({
	portfolioId: portfolioIdSchema,
	organizationId: institutionalUuidSchema,
	positionId: positionIdSchema,
	journalEntryId: z.string().min(1).max(128),
	cashDelta: z.string(),
	asset: z.string().min(3).max(8),
	fillId: z.string().min(1).max(128).optional(),
	provisionalSettled: z.boolean(),
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
	z.object({
		eventType: z.literal(PORTFOLIOS_EVENT_TYPES.VALUATION_CONFIRMED),
		payload: valuationConfirmedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PORTFOLIOS_EVENT_TYPES.RECONCILIATION_OPENED),
		payload: reconciliationOpenedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PORTFOLIOS_EVENT_TYPES.RECONCILIATION_RESOLVED),
		payload: reconciliationResolvedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(PORTFOLIOS_EVENT_TYPES.CASH_RECONCILED),
		payload: cashReconciledPayloadSchema,
	}),
]);

export type PortfoliosEventType =
	(typeof PORTFOLIOS_EVENT_TYPES)[keyof typeof PORTFOLIOS_EVENT_TYPES];
