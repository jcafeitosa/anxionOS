import { z } from "zod";
export const CAPITAL_OWNER_DOMAIN = "capital";
export const capitalAccountIdSchema = z.string().regex(/^cap_acc_[0-9a-f-]{36}$/i);
export const capitalAllocationIdSchema = z.string().regex(/^cap_alloc_[0-9a-f-]{36}$/i);
export const capitalReservationIdSchema = z.string().regex(/^cap_res_[0-9a-f-]{36}$/i);
export const capitalExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const capitalAccountStatusSchema = z.enum([
    "PENDING_VERIFICATION",
    "ACTIVE",
    "SUSPENDED",
    "CLOSED",
]);
export const capitalAllocationStateSchema = z.enum([
    "PROPOSED",
    "RESERVED",
    "ACTIVE",
    "RELEASING",
    "CLOSED",
    "REJECTED",
]);
export const capitalReservationStatusSchema = z.enum(["HELD", "CONSUMED", "RELEASED", "EXPIRED"]);
export const capitalReservationKindSchema = z.enum(["ORDER", "FEE_BUFFER", "MARGIN"]);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export class CapitalContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CapitalContractError";
    }
}
export function assertCapitalExecutionModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
        throw new CapitalContractError("CAP_REAL_MODE_REJECTED");
    }
    const parsed = capitalExecutionModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new CapitalContractError("CAP_REAL_MODE_REJECTED");
    }
}
