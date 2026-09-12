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
import { logUnhandledBoundaryError } from "../middleware/unhandled-error-log";

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
	// ANX-492: `PrincipalLookupUnavailableError` (de `@anxionos/organizations`)
	// sinaliza indisponibilidade do servico de identidade (falha de infra), NAO
	// "principal inexistente". Antes caia em `GOV_PRINCIPAL_NOT_FOUND` (404),
	// indistinguivel do caso de dominio (`throwGovernanceError` em
	// issue-grant/create-delegation/submit-change-proposal/activate-break-glass
	// quando `principalLookup.exists()` resolve `false`). Agora mapeia para
	// 503 com o codigo canonico do modulo em `details.code`, sem expor a
	// mensagem crua do driver/adapter de identidade.
	if (error instanceof PrincipalLookupUnavailableError) {
		const mapped = new GovernanceCommandError(
			"GOV_IDENTITY_UNAVAILABLE",
			"Identity service unavailable",
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
	logUnhandledBoundaryError(error, requestId);
	return {
		status: 500,
		body: toErrorResponse(error, { requestId }),
	};
}
