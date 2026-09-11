import {
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { GovernanceCommandError } from "@anxionos/governance";
import {
	OrganizationCommandError,
	PrincipalLookupUnavailableError,
} from "@anxionos/organizations";

export function mapGovernanceError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof OrganizationCommandError) {
		return {
			status: error.statusCode,
			body: toErrorResponse(error, { requestId }),
		};
	}
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = new GovernanceCommandError(
			"GOV_PRINCIPAL_NOT_FOUND",
			error.message,
			{ cause: error },
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof GovernanceCommandError || isAppError(error)) {
		return {
			status: resolveStatusCode(error),
			body: toErrorResponse(error, { requestId }),
		};
	}
	return {
		status: 500,
		body: toErrorResponse(error, { requestId }),
	};
}
