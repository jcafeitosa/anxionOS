import { throwCapitalError } from "../../application/errors";

export interface GrantValidationPort {
	validateGrant(grantId: string, organizationId: string): Promise<void>;
}

const INVALID_GRANT_STUB = "00000000-0000-0000-0000-000000000000";
export function createDefaultGrantValidationPort(): GrantValidationPort {
	return {
		async validateGrant(grantId) {
			if (grantId === INVALID_GRANT_STUB) {
				throwCapitalError("CAP_GRANT_INVALID", `Grant ${grantId} is invalid`);
			}
		},
	};
}
