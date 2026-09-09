export interface RiskPermitValidationInput {
    organizationId: string;
    riskPermitId: string;
    intentHash: string;
    authorityEpoch: number;
    riskEpoch: number;
}
export type RiskPermitValidationFailure = "NOT_FOUND" | "NOT_ISSUED" | "INTENT_MISMATCH" | "STALE";
export interface RiskPermitValidationPort {
    validatePermit(input: RiskPermitValidationInput): Promise<{
        valid: boolean;
        failure?: RiskPermitValidationFailure;
    }>;
}
