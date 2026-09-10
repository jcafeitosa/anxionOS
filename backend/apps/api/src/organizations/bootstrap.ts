import { createScopedPool, type TenantScopedQueryable } from "@anxionos/database";
import type { PrincipalRepository } from "@anxionos/identity";
import { createIdentityDb } from "@anxionos/identity";
import {
	createHmacInviteTokenHasherFromEnv,
	createIdentityPrincipalLookup,
	createOrganizationUnitOfWork,
	createOrganizationsDb,
} from "@anxionos/organizations";
import type { Pool } from "pg";
import type { OrganizationsPluginDeps } from "./plugin";

export interface OrganizationsRuntime {
	agencyRepository: OrganizationsPluginDeps["agencyRepository"];
	membershipRepository: OrganizationsPluginDeps["membershipRepository"];
	commandJournal: OrganizationsPluginDeps["commandJournal"];
	unitOfWork: OrganizationsPluginDeps["unitOfWork"];
	principalLookup: OrganizationsPluginDeps["principalLookup"];
	inviteTokenHasher: ReturnType<typeof createHmacInviteTokenHasherFromEnv>;
	identityRepository: PrincipalRepository;
	scopedPool: TenantScopedQueryable;
}

export function assertOrganizationsStartupEnv(): void {
	createHmacInviteTokenHasherFromEnv();
}

export function createOrganizationsRuntime(
	pool: Pool,
	databaseUrl: string,
): OrganizationsRuntime {
	const orgsDb = createOrganizationsDb(pool);
	const identity = createIdentityDb(pool);
	const scopedPool = createScopedPool({
		connectionString: databaseUrl,
		max: 10,
	});
	return {
		agencyRepository: orgsDb.agencyRepository,
		membershipRepository: orgsDb.membershipRepository,
		commandJournal: orgsDb.commandJournal,
		unitOfWork: createOrganizationUnitOfWork(pool),
		principalLookup: createIdentityPrincipalLookup(pool),
		inviteTokenHasher: createHmacInviteTokenHasherFromEnv(),
		identityRepository: identity.repository,
		scopedPool,
	};
}
