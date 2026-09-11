import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { resolveEvaluationErrorStatus } from "@anxionos/contracts/evaluation";
import { EvaluationCommandError } from "@anxionos/evaluation";
import { PrincipalLookupUnavailableError } from "@anxionos/organizations";

function evaluationCodeToAppError(error: EvaluationCommandError): AppError {
	const statusCode = resolveEvaluationErrorStatus(error.code);
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

export function mapEvaluationError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = evaluationCodeToAppError(
			new EvaluationCommandError("EVL_CROSS_TENANT", error.message),
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof EvaluationCommandError) {
		const mapped = evaluationCodeToAppError(error);
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
	return {
		status: 500,
		body: toErrorResponse(error, { requestId }),
	};
}
