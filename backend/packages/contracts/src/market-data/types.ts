import { z } from "zod";
export const MARKET_DATA_OWNER_DOMAIN = "market-data";
export const instrumentIdSchema = z.string().regex(/^md_ins_[0-9a-f-]{36}$/i);
export const instrumentSpecIdSchema = z.string().regex(/^md_spec_[0-9a-f-]{36}$/i);
export const executionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const instrumentKindSchema = z.enum(["SPOT", "PERP", "FUTURE", "OPTION", "INDEX"]);
export const instrumentStatusSchema = z.enum(["DRAFT", "ACTIVE", "SUSPENDED", "DELISTED", "DRAINING"]);
export const observationKindSchema = z.enum(["TRADE", "QUOTE", "MARK", "FUNDING", "INDEX"]);
export class MarketDataContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "MarketDataContractError";
    }
}
export function assertExecutionModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
        throw new MarketDataContractError("MD_EXECUTION_MODE_NOT_SUPPORTED");
    }
    const parsed = executionModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new MarketDataContractError("MD_EXECUTION_MODE_NOT_SUPPORTED");
    }
}
