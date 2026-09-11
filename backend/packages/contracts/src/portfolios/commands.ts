import { z } from "zod";
import { ledgerLineSummarySchema } from "../accounting/events";
import { institutionalUuidSchema } from "../institutional-uuid";
import { positionReconciliationCaseKindSchema } from "./reconciliation-types";
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
	valuationSnapshotId: z.string().min(1).optional(),
	reconciliationCaseId: z.string().min(1).optional(),
	cashPositionId: positionIdSchema.optional(),
	provisionalCash: z.boolean().optional(),
});
export const createPortfolioCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	ownerUserId: institutionalUuidSchema,
	capitalAccountId: z.string().min(1),
	name: z.string().min(1).max(128),
	baseCurrency: z.string().min(3).max(8),
	executionMode: portfoliosExecutionModeSchema,
});
export const applyFillToPositionCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	fillId: z.string().min(1).max(128),
	instrumentId: institutionalUuidSchema,
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

export const confirmValuationCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	asOf: z.string().datetime(),
	maxStalenessMs: z.number().finite().nonnegative(),
	quoteCurrency: z.string().min(3).max(8),
	executionMode: portfoliosExecutionModeSchema,
});

export type ConfirmValuationCommand = z.infer<
	typeof confirmValuationCommandSchema
>;

export const reconcileCashFromLedgerCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	journalEntryId: z.string().min(1).max(128),
	idempotencyKey: z.string().min(1).max(128),
	entryKind: z.string().min(1),
	valueDate: z.string(),
	linesSummary: z.array(ledgerLineSummarySchema).min(2),
	capitalAccountId: z.string().optional(),
	portfolioId: portfolioIdSchema.optional(),
	fillId: z.string().min(1).max(128).optional(),
});

export type ReconcileCashFromLedgerCommand = z.infer<
	typeof reconcileCashFromLedgerCommandSchema
>;

export const openPositionReconciliationCaseCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	portfolioId: portfolioIdSchema,
	caseKind: positionReconciliationCaseKindSchema,
	positionId: positionIdSchema.optional(),
	fillId: z.string().min(1).max(128).optional(),
	journalEntryId: z.string().min(1).max(128).optional(),
	evidence: z.string().max(512).optional(),
});

export type OpenPositionReconciliationCaseCommand = z.infer<
	typeof openPositionReconciliationCaseCommandSchema
>;

export const resolvePositionReconciliationCaseCommandSchema = z.object({
	commandId: institutionalUuidSchema,
	organizationId: institutionalUuidSchema,
	reconciliationCaseId: z.string().min(1),
	disposition: z.string().min(1).max(128),
	rationale: z.string().min(1).max(512),
});

export type ResolvePositionReconciliationCaseCommand = z.infer<
	typeof resolvePositionReconciliationCaseCommandSchema
>;
