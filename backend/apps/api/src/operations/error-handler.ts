import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import {
	type OperationsErrorCode,
	resolveOperationsErrorStatus,
} from "@anxionos/contracts/operations";
import { OperationsCommandError } from "@anxionos/operations";
import {
	OrganizationCommandError,
	PrincipalLookupUnavailableError,
} from "@anxionos/organizations";

function operationsCodeToAppError(error: OperationsCommandError): AppError {
	const statusCode = resolveOperationsErrorStatus(error.code);
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

export function mapOperationsError(
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
		const mapped = operationsCodeToAppError(
			new OperationsCommandError(
				"OPS_CROSS_TENANT" satisfies OperationsErrorCode,
				error.message,
			),
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof OperationsCommandError) {
		const mapped = operationsCodeToAppError(error);
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
