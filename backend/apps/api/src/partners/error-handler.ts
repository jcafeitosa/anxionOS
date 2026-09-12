import {
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { PrincipalLookupUnavailableError } from "@anxionos/organizations";
import { PartnersCommandError } from "@anxionos/partners";
import { logUnhandledBoundaryError } from "../middleware/unhandled-error-log";

export function mapPartnersError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = new PartnersCommandError(
			"PTR_GRANT_INVALID",
			error.message,
			{ cause: error },
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof PartnersCommandError || isAppError(error)) {
		return {
			status: resolveStatusCode(error),
			body: toErrorResponse(error, { requestId }),
		};
	}
	logUnhandledBoundaryError(error, requestId);
	return {
		status: 500,
		body: toErrorResponse(error, { requestId }),
	};
}
