import type { RiskPermitStatus } from "./types";

export interface RiskPermitEpochView {
	status: RiskPermitStatus | string;
	riskEpoch: number;
}

/** True when permit is not ISSUED or riskEpoch is behind the current registry epoch. */
export function isRiskPermitStale(
	permit: RiskPermitEpochView,
	currentRiskEpoch: number,
): boolean {
	return permit.status !== "ISSUED" || permit.riskEpoch !== currentRiskEpoch;
}
