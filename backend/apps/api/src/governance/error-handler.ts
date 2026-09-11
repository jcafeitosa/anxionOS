import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import { GovernanceCommandError } from "@anxionos/governance";
import {
	OrganizationCommandError,
	PrincipalLookupUnavailableError,
} from "@anxionos/organizations";
import { ZodError } from "zod";

/**
 * ANX-466 (G5 FURO 3) — corpo JSON malformado nao passa por `ZodError`: o
 * `request.json()` do boundary lanca `SyntaxError` e o mapeamento caia no 500.
 * Body invalido e' 400 nas duas formas (malformado e schema-invalido).
 */
function isMalformedBodyError(error: unknown): boolean {
	if (error instanceof SyntaxError) {
		return true;
	}
	if (typeof error !== "object" || error === null) {
		return false;
	}
	const candidate = error as { name?: unknown; code?: unknown };
	return (
		candidate.name === "SyntaxError" ||
		candidate.name === "ParseError" ||
		candidate.code === "PARSE"
	);
}

export function mapGovernanceError(
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
		const mapped = new GovernanceCommandError(
			"GOV_PRINCIPAL_NOT_FOUND",
			error.message,
			{ cause: error },
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
	// Body/parametro invalido e' 400, nao 500: o boundary de governance tambem
	// valida com Zod (achado LOW do G5 — antes um body com campo extra subia 500).
	if (error instanceof ZodError) {
		return {
			status: 400,
			body: toErrorResponse(
				AppError.validation("Invalid request payload", {
					issues: error.issues.map((issue) => ({
						path: issue.path.join("."),
						code: issue.code,
					})),
				}),
				{ requestId },
			),
		};
	}
	if (isMalformedBodyError(error)) {
		return {
			status: 400,
			body: toErrorResponse(AppError.validation("Malformed JSON body"), {
				requestId,
			}),
		};
	}
	if (error instanceof GovernanceCommandError || isAppError(error)) {
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
