import type {
	CommissionAccrualRecord,
	CommissionAccrualRepository,
} from "../../domain/ports/partners-unit-of-work";

export interface ListCommissionAccrualsDeps {
	commissionAccruals: CommissionAccrualRepository;
}

export async function listCommissionAccruals(
	deps: ListCommissionAccrualsDeps,
	partnerOrganizationId: string,
	partnerId?: string,
): Promise<CommissionAccrualRecord[]> {
	return deps.commissionAccruals.listByPartnerOrganization(
		partnerOrganizationId,
		partnerId,
	);
}
