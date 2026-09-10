import type { TenantContext } from "../../domain/ports/tenant-context";

export function buildOrganizationTenantContext(
	organizationId: string,
	options?: { agencyId?: string; principalId?: string },
): TenantContext {
	return {
		tenantId: organizationId,
		agencyId: options?.agencyId,
		principalId: options?.principalId,
	};
}
