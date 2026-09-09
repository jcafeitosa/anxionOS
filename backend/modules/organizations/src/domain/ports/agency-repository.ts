import type { Agency } from "../entities/agency";

export interface AgencyRepository {
	save(agency: Agency): Promise<Agency>;
	findByAgencyId(agencyId: string): Promise<Agency | null>;
	findByOwnerPrincipalId(ownerPrincipalId: string): Promise<Agency[]>;
}
