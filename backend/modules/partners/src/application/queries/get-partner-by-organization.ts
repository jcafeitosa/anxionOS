import type { PartnerRecord, PartnerRepository } from "../../domain/ports/partners-unit-of-work";
import { throwPartnersError } from "../errors";

export interface GetPartnerByOrganizationDeps {
	partners: PartnerRepository;
}

export async function getPartnerByOrganization(
	deps: GetPartnerByOrganizationDeps,
	partnerOrganizationId: string,
): Promise<PartnerRecord> {
	const partner = await deps.partners.findByOrganizationId(partnerOrganizationId);
	if (!partner) {
		throwPartnersError("PTR_PARTNER_NOT_FOUND", "partner not found for organization");
	}
	return partner;
}
