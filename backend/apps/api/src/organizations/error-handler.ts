import {
	AppError,
	isAppError,
	resolveStatusCode,
	toErrorResponse,
} from "@anxionos/contracts/errors";
import {
	OrganizationCommandError,
	PrincipalLookupUnavailableError,
} from "@anxionos/organizations";
import { ZodError } from "zod";

/**
 * ANX-460 (G3) — body invalido e' 400, nao 500. O mapeamento caia direto no
 * `return { status: 500 }` para `ZodError` (`.strict()` de campo extra, UUID
 * invalido) e para JSON malformado (`request.json()` lanca `SyntaxError`), entao
 * TODAS as rotas de organizations respondiam 500 a um body ruim. Mesmo
 * mapeamento ja' provado no boundary de governance (ANX-466, G5 FURO 3).
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

export function mapOrganizationsError(
	error: unknown,
	requestId?: string,
): { status: number; body: ReturnType<typeof toErrorResponse> } {
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = new OrganizationCommandError(
			"ORG_IDENTITY_UNAVAILABLE",
			error.message,
			{ cause: error },
		);
		return {
			status: mapped.statusCode,
			body: toErrorResponse(mapped, { requestId }),
		};
	}
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
