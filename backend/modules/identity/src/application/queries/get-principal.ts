import type { Principal } from "../../domain/entities/principal";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";

/**
 * D-IDN-008 / INV-IDN-01: only ACTIVE principals are visible to consumers.
 * SUSPENDED and REVOKED both fail closed — a revoked principal must never be
 * resolvable as valid, otherwise a revoked actor would pass organization guards
 * (`assertPrincipalExists`) and session resolution.
 */
function toActivePrincipal(principal: Principal | null): Principal | null {
	if (!principal || principal.status !== "active") {
		return null;
	}
	return principal;
}

export async function getPrincipalById(
	repository: PrincipalRepository,
	principalId: string,
): Promise<Principal | null> {
	const principal = await repository.findById(principalId);
	return toActivePrincipal(principal);
}

export async function getPrincipalByAuthUserId(
	repository: PrincipalRepository,
	authUserId: string,
): Promise<Principal | null> {
	const principal = await repository.findByAuthUserId(authUserId);
	return toActivePrincipal(principal);
}
