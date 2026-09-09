import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import { PrincipalLookupUnavailableError } from "../../domain/ports/principal-lookup";
import { throwOrganizationError } from "../errors";

export async function assertPrincipalExists(
	principalLookup: PrincipalLookup,
	principalId: string,
): Promise<void> {
	try {
		const exists = await principalLookup.exists(principalId);
        if (!exists) {
            throwOrganizationError("ORG_PRINCIPAL_NOT_FOUND", `Principal ${principalId} not found`);
        }
    }
    catch (error) {
        if (error instanceof PrincipalLookupUnavailableError) {
            throwOrganizationError("ORG_IDENTITY_UNAVAILABLE", "Identity service unavailable", { cause: error });
        }
        throw error;
    }
}
