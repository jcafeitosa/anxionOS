import { z } from "zod";
export const RISK_OWNER_DOMAIN = "risk";
export const riskPolicyIdSchema = z.string().regex(/^rk_pol_[0-9a-f-]{36}$/i);
export const riskCheckIdSchema = z.string().regex(/^rk_chk_[0-9a-f-]{36}$/i);
export const riskPermitIdSchema = z.string().regex(/^rk_pmt_[0-9a-f-]{36}$/i);
export const riskExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const checkResultSchema = z.enum(["PASS", "DENY", "DEFER"]);
export const riskPolicyStatusSchema = z.enum([
	"DRAFT",
	"ACTIVE",
	"SUPERSEDED",
	"REVOKED",
]);
export const riskPermitStatusSchema = z.enum([
	"ISSUED",
	"CONSUMED",
	"REVOKED",
	"EXPIRED",
]);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export class RiskContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RiskContractError";
	}
}
export function assertRiskExecutionModeSupported(mode: string): void {
	if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
		throw new RiskContractError("RK_REAL_MODE_REJECTED");
	}
	const parsed = riskExecutionModeSchema.safeParse(mode);
	if (!parsed.success) {
		throw new RiskContractError("RK_REAL_MODE_REJECTED");
	}
}

export type RiskExecutionMode = z.infer<typeof riskExecutionModeSchema>;
export type CheckResult = z.infer<typeof checkResultSchema>;
export type RiskPolicyStatus = z.infer<typeof riskPolicyStatusSchema>;
export type RiskPermitStatus = z.infer<typeof riskPermitStatusSchema>;
