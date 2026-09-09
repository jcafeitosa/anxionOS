import { z } from "zod";
import { journalEntryIdSchema } from "./types";
export const ACCOUNTING_EVENT_TYPES = {
    LEDGER_POSTED: "accounting.ledger.posted.v1",
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
    organizationId: z.string().uuid(),
    idempotencyKey: z.string().min(1).max(128),
    entryKind: z.string().min(1),
    linesSummary: z.array(ledgerLineSummarySchema).min(2),
    valueDate: z.string(),
    capitalAccountId: z.string().optional(),
    portfolioId: z.string().uuid().optional(),
});
export const accountingEventPayloadSchema = z.discriminatedUnion("eventType", [
    z.object({
        eventType: z.literal(ACCOUNTING_EVENT_TYPES.LEDGER_POSTED),
        payload: ledgerPostedPayloadSchema,
    }),
]);

export type AccountingEventType = (typeof ACCOUNTING_EVENT_TYPES)[keyof typeof ACCOUNTING_EVENT_TYPES];
