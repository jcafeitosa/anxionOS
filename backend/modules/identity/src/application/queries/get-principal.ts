import type { Principal } from "../../domain/entities/principal";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";

function toActivePrincipal(principal: Principal | null): Principal | null {
	if (!principal || principal.status === "suspended") {
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
