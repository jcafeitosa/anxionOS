import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { PrincipalLookupUnavailableError } from "@anxionos/organizations";
import { logUnhandledBoundaryError } from "../middleware/unhandled-error-log";

export function mapPortfoliosError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = AppError.forbidden(error.message);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (isAppError(error)) {
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
