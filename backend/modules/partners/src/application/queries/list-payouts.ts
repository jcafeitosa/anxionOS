import type {
	PayoutRecord,
	PayoutRepository,
} from "../../domain/ports/partners-unit-of-work";

export interface ListPayoutsDeps {
	payouts: PayoutRepository;
}

export async function listPayouts(
	deps: ListPayoutsDeps,
	partnerOrganizationId: string,
	partnerId?: string,
): Promise<PayoutRecord[]> {
	return deps.payouts.listByPartnerOrganization(
		partnerOrganizationId,
		partnerId,
	);
}
