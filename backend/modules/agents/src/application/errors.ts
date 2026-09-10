import { AppError } from "@anxionos/contracts/errors";
import {
	AGENTS_ERROR_STATUS_MAP,
	type AgentsErrorCode,
	type CommandResult,
} from "@anxionos/contracts/agents";

export class AgentsCommandError extends AppError {
	agentsCode: AgentsErrorCode;

	constructor(
		agentsCode: AgentsErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = AGENTS_ERROR_STATUS_MAP[agentsCode];
		const appCode =
			statusCode === 404
					? "NOT_FOUND"
					: statusCode === 403
						? "FORBIDDEN"
						: statusCode === 409
							? "CONFLICT"
							: statusCode === 400
								? "VALIDATION_ERROR"
								: "INTERNAL_ERROR";
		super({
			code: appCode,
			message,
			details: { code: agentsCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "AgentsCommandError";
		this.agentsCode = agentsCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwAgentsError(
	code: AgentsErrorCode,
	message: string,
	options?: { cause?: unknown },
): never {
	throw new AgentsCommandError(code, message, options);
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
