import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import {
	type RiskErrorCode,
	resolveRiskErrorStatus,
} from "@anxionos/contracts/risk";
import { PrincipalLookupUnavailableError } from "@anxionos/organizations";
import { RiskCommandError } from "@anxionos/risk";
import { logUnhandledBoundaryError } from "../middleware/unhandled-error-log";

function riskCodeToAppError(error: RiskCommandError): AppError {
	const statusCode = resolveRiskErrorStatus(error.code);
	const appCode =
		statusCode === 404
			? "NOT_FOUND"
			: statusCode === 403
				? "FORBIDDEN"
				: statusCode === 409
					? "CONFLICT"
					: statusCode === 422 || statusCode === 400
						? "VALIDATION_ERROR"
						: "INTERNAL_ERROR";
	const appError = new AppError({
		code: appCode,
		message: error.message,
		details: { code: error.code },
		expose: true,
	});
	if (statusCode !== appError.statusCode) {
		Object.defineProperty(appError, "statusCode", { value: statusCode });
	}
	return appError;
}

export function mapRiskError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = riskCodeToAppError(
			new RiskCommandError(
				"RK_CROSS_TENANT" satisfies RiskErrorCode,
				error.message,
			),
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof RiskCommandError) {
		const mapped = riskCodeToAppError(error);
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
