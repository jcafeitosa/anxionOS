import { z } from "zod";
import { accountingEntryKindSchema, accountingExecutionModeSchema, decimalAmountSchema, journalEntryIdSchema, orderSideSchema, } from "./types";
export const accountingCommandResultSchema = z.object({
    aggregateId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    idempotentReplay: z.boolean().optional(),
    entryId: journalEntryIdSchema.optional(),
});
export const ledgerLineSchema = z.object({
    accountCode: z.string().min(1).max(64),
    debit: decimalAmountSchema,
    credit: decimalAmountSchema,
    asset: z.string().min(1).max(16),
    amount: decimalAmountSchema,
});
export const postLedgerEntryCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    idempotencyKey: z.string().min(1).max(128),
    entryKind: accountingEntryKindSchema.default("MANUAL"),
    executionMode: accountingExecutionModeSchema,
    lines: z.array(ledgerLineSchema).min(2),
    valueDate: z.string().optional(),
    capitalAccountId: z.string().optional(),
    portfolioId: z.string().uuid().optional(),
    sourceRef: z
        .object({
        ownerDomain: z.string().min(1),
        aggregateId: z.string().min(1),
        eventId: z.string().uuid(),
    })
        .optional(),
});
export const postTradeFillCommandSchema = z.object({
    commandId: z.string().uuid(),
    organizationId: z.string().uuid(),
    fillId: z.string().min(1).max(128),
    orderId: z.string().uuid(),
    side: orderSideSchema,
    asset: z.string().min(1).max(16),
    notionalAmount: decimalAmountSchema,
    executionMode: accountingExecutionModeSchema,
    idempotencyKey: z.string().min(1).max(128),
    capitalAccountId: z.string().optional(),
    portfolioId: z.string().uuid().optional(),
    valueDate: z.string().optional(),
});

export type AccountingCommandResult = z.infer<typeof accountingCommandResultSchema>;

export type LedgerLine = z.infer<typeof ledgerLineSchema>;

export type PostLedgerEntryCommand = z.infer<typeof postLedgerEntryCommandSchema>;

export type PostTradeFillCommand = z.infer<typeof postTradeFillCommandSchema>;
