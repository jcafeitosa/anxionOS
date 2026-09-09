import { createIdentityDb, getPrincipalById } from "@anxionos/identity";
import type { Pool } from "pg";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import { PrincipalLookupUnavailableError } from "../../domain/ports/principal-lookup";

export function createIdentityPrincipalLookup(pool: Pool): PrincipalLookup {
	const { repository } = createIdentityDb(pool);
	return {
		async exists(principalId: string) {
			try {
				const principal = await getPrincipalById(repository, principalId);
				return principal !== null;
			} catch (error) {
				throw new PrincipalLookupUnavailableError("Identity service unavailable", {
					cause: error,
				});
			}
		},
	};
}
