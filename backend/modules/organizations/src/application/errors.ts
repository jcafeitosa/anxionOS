import { AppError } from "@anxionos/contracts/errors";
import {
	type CommandResult,
	ORGANIZATION_ERROR_STATUS_MAP,
	type OrganizationErrorCode,
} from "@anxionos/contracts/organizations";

export class OrganizationCommandError extends AppError {
	organizationCode: OrganizationErrorCode;

	constructor(
		organizationCode: OrganizationErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = ORGANIZATION_ERROR_STATUS_MAP[organizationCode];
		const appCode =
			statusCode === 503
				? "SERVICE_UNAVAILABLE"
				: statusCode === 404
					? "NOT_FOUND"
					: statusCode === 403
						? "FORBIDDEN"
						: statusCode === 409
							? "CONFLICT"
							: statusCode === 410
								? "CONFLICT"
								: "INTERNAL_ERROR";
		super({
			code: appCode,
			message,
			details: { code: organizationCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "OrganizationCommandError";
		this.organizationCode = organizationCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwOrganizationError(
	code: OrganizationErrorCode,
	message: string,
	options?: { cause?: unknown },
): never {
	throw new OrganizationCommandError(code, message, options);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown> | null,
): CommandResult {
	if (!snapshot || typeof snapshot.aggregateId !== "string") {
		throw new Error("Invalid command journal response snapshot");
	}
	return {
		aggregateId: snapshot.aggregateId,
		revision: typeof snapshot.revision === "number" ? snapshot.revision : 0,
		idempotentReplay: true,
	};
}
