import type { TenantContext } from "../../domain/ports/tenant-context";

/** Agency-scoped tenant boundary until platform-level tenants are modeled separately. */
export function buildAgencyTenantContext(
	agencyId: string,
	principalId: string,
): TenantContext {
	return {
		tenantId: agencyId,
		agencyId,
		principalId,
	};
}
