import { z } from "zod";
export const EXECUTION_OWNER_DOMAIN = "execution";
export const executionSessionIdSchema = z.string().regex(/^ex_ses_[0-9a-f-]{36}$/i);
export const executionOrderIdSchema = z.string().regex(/^ex_ord_[0-9a-f-]{36}$/i);
export const executionFillIdSchema = z.string().regex(/^ex_fill_[0-9a-f-]{36}$/i);
export const venueAdapterRefIdSchema = z.string().regex(/^ex_vad_[0-9a-f-]{36}$/i);
export const executionModuleModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const executionSessionStatusSchema = z.enum(["OPEN", "CLOSED"]);
export const executionOrderStatusSchema = z.enum(["SUBMITTED", "FILLED", "CANCELLED"]);
export const executionFillStatusSchema = z.enum(["CONFIRMED", "REJECTED"]);
export const executionOrderSideSchema = z.enum(["BUY", "SELL"]);
export const venueAdapterKindSchema = z.enum(["SIMULATED"]);
export const executionDecimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export class ExecutionModuleContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ExecutionModuleContractError";
    }
}
export function assertExecutionModuleModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
        throw new ExecutionModuleContractError("EX_MODE_FORBIDDEN");
    }
    const parsed = executionModuleModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new ExecutionModuleContractError("EX_MODE_FORBIDDEN");
    }
}

export type ExecutionModuleMode = z.infer<typeof executionModuleModeSchema>;
export type ExecutionSessionStatus = z.infer<typeof executionSessionStatusSchema>;
export type ExecutionOrderStatus = z.infer<typeof executionOrderStatusSchema>;
export type ExecutionFillStatus = z.infer<typeof executionFillStatusSchema>;
export type ExecutionOrderSide = z.infer<typeof executionOrderSideSchema>;
export type VenueAdapterKind = z.infer<typeof venueAdapterKindSchema>;
