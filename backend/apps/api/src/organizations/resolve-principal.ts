import { AppError } from "@anxionos/contracts/errors";
import {
	type PrincipalRepository,
	getPrincipalByAuthUserId,
} from "@anxionos/identity";
import type { Principal } from "@anxionos/identity";

export async function resolvePrincipalFromSession(
	repository: PrincipalRepository,
	authUserId: string,
): Promise<Principal> {
	const principal = await getPrincipalByAuthUserId(repository, authUserId);
	if (!principal) {
		throw AppError.unauthorized("Principal not found for authenticated user");
	}
	return principal;
}
