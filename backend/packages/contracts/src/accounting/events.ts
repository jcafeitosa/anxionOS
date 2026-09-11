import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import { journalEntryIdSchema } from "./types";
export const ACCOUNTING_EVENT_TYPES = {
	LEDGER_POSTED: "accounting.ledger.posted.v1",
	REVERSAL_POSTED: "accounting.reversal.posted.v1",
};
export const ledgerLineSummarySchema = z.object({
	accountCode: z.string().min(1).max(64),
	debit: z.string(),
	credit: z.string(),
	asset: z.string(),
	amount: z.string(),
});
export const ledgerPostedPayloadSchema = z.object({
	entryId: journalEntryIdSchema,
	organizationId: institutionalUuidSchema,
	idempotencyKey: z.string().min(1).max(128),
	entryKind: z.string().min(1),
	linesSummary: z.array(ledgerLineSummarySchema).min(2),
	valueDate: z.string(),
	capitalAccountId: z.string().optional(),
	portfolioId: institutionalUuidSchema.optional(),
});
export const ledgerReversalPostedPayloadSchema = z.object({
	reversalEntryId: journalEntryIdSchema,
	reversesEntryId: journalEntryIdSchema,
	organizationId: institutionalUuidSchema,
	idempotencyKey: z.string().min(1).max(128),
	reason: z.string().optional(),
});

export const accountingEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(ACCOUNTING_EVENT_TYPES.LEDGER_POSTED),
		payload: ledgerPostedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(ACCOUNTING_EVENT_TYPES.REVERSAL_POSTED),
		payload: ledgerReversalPostedPayloadSchema,
	}),
]);

export type AccountingEventType =
	(typeof ACCOUNTING_EVENT_TYPES)[keyof typeof ACCOUNTING_EVENT_TYPES];
