import type { TenantScopedQueryable } from "@anxionos/database";
import { assertAgencyScope } from "@anxionos/organizations";
import { runAgencyScopedRead } from "../../middleware/resolve-tenant-context";

export async function requireAgencyMembership(
	scopedPool: TenantScopedQueryable,
	agencyId: string,
	principalId: string,
): Promise<void> {
	await runAgencyScopedRead(scopedPool, agencyId, principalId, (repos) =>
		assertAgencyScope(repos.membershipRepository, principalId, agencyId),
	);
}
