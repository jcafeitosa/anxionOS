import { createIdentityDb } from "@anxionos/identity";
import type { Pool } from "pg";
import { createBetterAuthSessionRevoker } from "./better-auth-session-revoker";
import type { IdentityPluginDeps } from "./deps";

export type IdentityApiRuntime = Omit<
	IdentityPluginDeps,
	"auth" | "grantRepository" | "agencyScope"
>;

/**
 * Composition root for the identity module in `apps/api`: builds repositories,
 * the unit of work and the adapters that only the HTTP boundary needs.
 */
export function createIdentityApiRuntime(pool: Pool): IdentityApiRuntime {
	const db = createIdentityDb(pool);
	return {
		identityRepository: db.repository,
		serviceIdentityRepository: db.serviceIdentityRepository,
		serviceCredentialRepository: db.serviceCredentialRepository,
		sessionRefRepository: db.sessionRefRepository,
		identityUnitOfWork: db.unitOfWork,
		sessionRevoker: createBetterAuthSessionRevoker(pool),
	};
}
