import type {
	PartnerRecord,
	PartnerRepository,
} from "../../domain/ports/partners-unit-of-work";
import { throwPartnersError } from "../errors";

export interface GetPartnerByIdDeps {
	partners: PartnerRepository;
}

export async function getPartnerById(
	deps: GetPartnerByIdDeps,
	input: { partnerId: string; organizationId: string },
): Promise<PartnerRecord> {
	const partner = await deps.partners.findById(
		input.partnerId,
		input.organizationId,
	);
	if (!partner) {
		throwPartnersError("PTR_PARTNER_NOT_FOUND", "partner not found");
	}
	return partner;
}
