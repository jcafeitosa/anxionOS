import type { TenantScopedQueryable } from "@anxionos/database";
import { assertActorCanMutate } from "@anxionos/organizations";
import { runAgencyScopedRead } from "../../middleware/resolve-tenant-context";

export async function requireAgencyMutationRole(
	scopedPool: TenantScopedQueryable,
	agencyId: string,
	principalId: string,
): Promise<void> {
	await runAgencyScopedRead(scopedPool, agencyId, principalId, (repos) =>
		assertActorCanMutate(repos.membershipRepository, principalId, agencyId),
	);
}
