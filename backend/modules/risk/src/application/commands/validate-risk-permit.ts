import { isRiskPermitStale } from "@anxionos/contracts/risk";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import { throwRiskError } from "../errors";

export interface ValidateRiskPermitInput {
	organizationId: string;
	permitId: string;
	riskEpoch: number;
}

export interface ValidateRiskPermitDeps {
	unitOfWork: RiskUnitOfWork;
}

export async function validateRiskPermit(
	deps: ValidateRiskPermitDeps,
	input: ValidateRiskPermitInput,
): Promise<{ permitId: string; status: string; riskEpoch: number }> {
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const permit = await ctx.permits.findById(
			input.organizationId,
			input.permitId,
		);
		if (!permit) {
			throwRiskError("RK_PERMIT_STALE", "risk permit not found");
		}
		if (permit.organizationId !== input.organizationId) {
			throwRiskError("RK_CROSS_TENANT", "risk permit organization mismatch");
		}
		const epoch = await ctx.epochRegistry.findByOrganization(
			input.organizationId,
		);
		const currentRiskEpoch = epoch?.currentRiskEpoch ?? 0;
		if (
			isRiskPermitStale(permit, currentRiskEpoch) ||
			permit.riskEpoch !== input.riskEpoch
		) {
			throwRiskError("RK_PERMIT_STALE", "risk permit is stale or revoked");
		}
		return {
			permitId: permit.id,
			status: permit.status,
			riskEpoch: permit.riskEpoch,
		};
	});
}
