import type { GetKillSwitchStatusResponse } from "@anxionos/contracts/risk";
import { getKillSwitchStatusResponseSchema } from "@anxionos/contracts/risk";
import type { KillSwitchRepository } from "../../domain/ports/risk-unit-of-work";

export interface GetKillSwitchStatusDeps {
	killSwitch: KillSwitchRepository;
}

export async function getKillSwitchStatus(
	deps: GetKillSwitchStatusDeps,
	organizationId: string,
): Promise<GetKillSwitchStatusResponse> {
	const row = await deps.killSwitch.findOrganizationStatus(organizationId);
	return getKillSwitchStatusResponseSchema.parse({
		status: {
			killSwitchId: row.id,
			organizationId: row.organizationId,
			scope: row.scope,
			portfolioId: row.portfolioId,
			killSwitchActive: row.killSwitchActive,
			reason: row.reason ?? null,
			activatedBy: row.activatedBy ?? null,
			activatedAt: row.activatedAt ?? null,
			releasedAt: row.releasedAt ?? null,
			riskEpoch: row.riskEpochAtActivation ?? undefined,
		},
	});
}
