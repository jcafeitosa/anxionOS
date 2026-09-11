import type { GrantRepository } from "@anxionos/governance";
import type {
	AgencyScopePort,
	IdentityTransactionContext,
	IdentityUnitOfWork,
	PrincipalRepository,
	ServiceCredentialRepository,
	ServiceIdentityRepository,
	SessionRefRepository,
	SessionRevocationPort,
} from "@anxionos/identity";

/** Session lookup provided by the Better Auth composition root. */
export interface IdentitySessionAuth {
	api: {
		getSession(input: {
			headers: Headers;
		}): Promise<{ user?: { id?: string } } | null>;
	};
}

/**
 * Dependencies of the identity HTTP boundary. Grants come from `governance`
 * (its owner) and agency scope from `organizations` membership — identity never
 * reads another module's tables.
 */
export interface IdentityPluginDeps {
	auth: IdentitySessionAuth;
	identityRepository: PrincipalRepository;
	sessionRefRepository: SessionRefRepository;
	identityUnitOfWork: IdentityUnitOfWork;
	grantRepository: GrantRepository;
	agencyScope: AgencyScopePort;
	/** Inline revocation so a disabled consumer cannot leave a session open. */
	sessionRevoker?: SessionRevocationPort;
}
