import { AgentsCommandError } from "@anxionos/agents";
import {
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { PrincipalLookupUnavailableError } from "@anxionos/organizations";
import { logUnhandledBoundaryError } from "../middleware/unhandled-error-log";

export function mapAgentsError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = new AgentsCommandError(
			"AGT_AGENT_NOT_FOUND",
			error.message,
			{ cause: error },
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	if (error instanceof AgentsCommandError || isAppError(error)) {
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
