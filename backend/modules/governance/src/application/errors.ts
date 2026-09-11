import { AppError } from "@anxionos/contracts/errors";
import {
	GOVERNANCE_ERROR_STATUS_MAP,
	type GovernanceCommandResult,
	type GovernanceErrorCode,
} from "@anxionos/contracts/governance";

export class GovernanceCommandError extends AppError {
	governanceCode: GovernanceErrorCode;

	constructor(
		governanceCode: GovernanceErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = GOVERNANCE_ERROR_STATUS_MAP[governanceCode];
		const appCode =
			statusCode === 400
				? "VALIDATION_ERROR"
				: statusCode === 404
					? "NOT_FOUND"
					: statusCode === 403
						? "FORBIDDEN"
						: statusCode === 409
							? "CONFLICT"
							: "INTERNAL_ERROR";
		super({
			code: appCode,
			message,
			details: { code: governanceCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "GovernanceCommandError";
		this.governanceCode = governanceCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwGovernanceError(
	code: GovernanceErrorCode,
	message: string,
	options?: { cause?: unknown },
): never {
	throw new GovernanceCommandError(code, message, options);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown> | null,
): GovernanceCommandResult {
	if (!snapshot || typeof snapshot.aggregateId !== "string") {
		throw new Error("Invalid command journal response snapshot");
	}
	return {
		aggregateId: snapshot.aggregateId,
		revision: typeof snapshot.revision === "number" ? snapshot.revision : 0,
		authorityEpoch:
			typeof snapshot.authorityEpoch === "number"
				? snapshot.authorityEpoch
				: undefined,
		idempotentReplay: true,
	};
}
