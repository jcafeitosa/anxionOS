import { AppError } from "@anxionos/contracts/errors";
import {
	IDENTITY_ERROR_STATUS_MAP,
	type IdentityErrorCode,
} from "@anxionos/contracts/identity";

export class IdentityCommandError extends AppError {
	identityCode: IdentityErrorCode;

	constructor(
		identityCode: IdentityErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = IDENTITY_ERROR_STATUS_MAP[identityCode];
		const appCode =
			statusCode === 503
				? "SERVICE_UNAVAILABLE"
				: statusCode === 404
					? "NOT_FOUND"
					: statusCode === 409
						? "CONFLICT"
						: "INTERNAL_ERROR";
		super({
			code: appCode,
			message,
			details: { code: identityCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "IdentityCommandError";
		this.identityCode = identityCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwIdentityError(
	code: IdentityErrorCode,
	message: string,
	options?: { cause?: unknown },
): never {
	throw new IdentityCommandError(code, message, options);
}
