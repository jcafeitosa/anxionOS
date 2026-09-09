import { z } from "zod";
export const PORTFOLIOS_OWNER_DOMAIN = "portfolios";
export const portfolioIdSchema = z.string().regex(/^pf_prt_[0-9a-f-]{36}$/i);
export const positionIdSchema = z.string().regex(/^pf_pos_[0-9a-f-]{36}$/i);
export const holdingIdSchema = z.string().regex(/^pf_hld_[0-9a-f-]{36}$/i);
export const portfoliosExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const portfolioStatusSchema = z.enum(["ACTIVE", "CLOSED"]);
export const positionSideSchema = z.enum(["LONG", "SHORT", "CASH"]);
export const positionBookSchema = z.enum(["TRADING"]).default("TRADING");
export const fillSideSchema = z.enum(["BUY", "SELL"]);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export class PortfoliosContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PortfoliosContractError";
    }
}
export function assertPortfoliosExecutionModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
        throw new PortfoliosContractError("PF_REAL_MODE_REJECTED");
    }
    const parsed = portfoliosExecutionModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new PortfoliosContractError("PF_REAL_MODE_REJECTED");
    }
}
