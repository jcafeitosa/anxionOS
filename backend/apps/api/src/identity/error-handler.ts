import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { resolveIdentityErrorStatus } from "@anxionos/contracts/identity";
import { IdentityCommandError } from "@anxionos/identity";
import { ZodError } from "zod";

function identityCodeToAppError(error: IdentityCommandError): AppError {
	const statusCode = resolveIdentityErrorStatus(error.identityCode);
	const appCode =
		statusCode === 404
			? "NOT_FOUND"
			: statusCode === 403
				? "FORBIDDEN"
				: statusCode === 401
					? "UNAUTHORIZED"
					: statusCode === 409
						? "CONFLICT"
						: statusCode === 503
							? "SERVICE_UNAVAILABLE"
							: "INTERNAL_ERROR";
	const appError = new AppError({
		code: appCode,
		message: error.message,
		details: { code: error.identityCode },
		expose: true,
	});
	if (statusCode !== appError.statusCode) {
		Object.defineProperty(appError, "statusCode", { value: statusCode });
	}
	return appError;
}

/**
 * Maps identity failures to the institutional error envelope, preserving the
 * `IDN_*` code in `details.code` (R04).
 */
export function mapIdentityError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof IdentityCommandError) {
		const mapped = identityCodeToAppError(error);
		return {
			// `details.code` e contrato de R04 e nao e segredo: nao pode sumir em
			// producao (toErrorResponse omite details por padrao fora de dev).
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId, exposeDetails: true }),
		};
	}
	if (error instanceof ZodError) {
		const invalid = AppError.validation(
			error.issues
				.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
				.join("; "),
		);
		return {
			status: resolveStatusCode(invalid),
			body: toErrorResponse(invalid, { requestId, exposeDetails: true }),
		};
	}
	if (isAppError(error)) {
		return {
			status: resolveStatusCode(error),
			body: toErrorResponse(error, { requestId, exposeDetails: true }),
		};
	}
	return {
		status: 500,
		body: toErrorResponse(error, { requestId }),
	};
}
