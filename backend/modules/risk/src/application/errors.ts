import {
	type RiskCommandResult,
	type RiskErrorCode,
	riskCommandResultSchema,
} from "@anxionos/contracts/risk";

export class RiskCommandError extends Error {
	readonly code: RiskErrorCode;

	constructor(code: RiskErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "RiskCommandError";
	}
}

export function throwRiskError(code: RiskErrorCode, message: string): never {
	throw new RiskCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): RiskCommandResult {
	return riskCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		policyId: snapshot.policyId,
		checkId: snapshot.checkId,
		permitId: snapshot.permitId,
		checkResult: snapshot.checkResult,
		denyReasonCode: snapshot.denyReasonCode,
	});
}
