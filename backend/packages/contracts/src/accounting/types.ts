import { z } from "zod";
export const ACCOUNTING_OWNER_DOMAIN = "accounting";
export const journalEntryIdSchema = z.string().regex(/^acc_je_[0-9a-f-]{36}$/i);
export const ledgerPostingIdSchema = z.string().regex(/^acc_post_[0-9a-f-]{36}$/i);
export const accountingExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const accountingEntryKindSchema = z.enum([
    "TRADE_FILL",
    "MANUAL",
    "ADJUSTMENT",
    "FEE",
    "BILLING_RECOGNITION",
    "REVERSAL",
]);
export const accountingAccountKindSchema = z.enum([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
    "CLEARING",
]);
export const orderSideSchema = z.enum(["BUY", "SELL"]);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export class AccountingContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AccountingContractError";
    }
}
export function assertAccountingExecutionModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
        throw new AccountingContractError("ACC_REAL_MODE_REJECTED");
    }
    const parsed = accountingExecutionModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new AccountingContractError("ACC_REAL_MODE_REJECTED");
    }
}
