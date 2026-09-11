import { z } from "zod";

export const KILL_SWITCH_MUTATIONS_CONTRACT =
	"POST /v1/risk/agencies/:agencyId/kill-switch/{activate|release}. Montado em apps/api via createRiskPlugin + Idempotency-Key (institutional UUID). DTO riskCommandResultSchema em @anxionos/contracts/risk.";

const riskCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	killSwitchId: z
		.string()
		.regex(/^rk_ksw_[0-9a-f-]{36}$/i)
		.optional(),
	riskEpoch: z.number().int().nonnegative().optional(),
	killSwitchActive: z.boolean().optional(),
});

export type KillSwitchCommandResult = z.infer<typeof riskCommandResultSchema>;

export type KillSwitchMutationAction = "activate" | "release";

export type KillSwitchMutationOutcome =
	| {
			kind: "success";
			result: KillSwitchCommandResult;
			idempotentReplay: boolean;
			status: number;
	  }
	| { kind: "denied"; status: number }
	| { kind: "revision_conflict"; status: number }
	| { kind: "validation_error"; status: number; message: string }
	| { kind: "stale"; status: number | null };

export type KillSwitchMutationFetchFn = typeof fetch;

export type KillSwitchActivateBody = {
	reason: string;
	activatedBy: string;
	scope?: "ORGANIZATION" | "PORTFOLIO";
	portfolioId?: string;
};

export type KillSwitchReleaseBody = {
	releasedBy: string;
	scope?: "ORGANIZATION" | "PORTFOLIO";
	portfolioId?: string;
};

function killSwitchMutationPath(
	agencyId: string,
	action: KillSwitchMutationAction,
): string {
	return `/v1/risk/agencies/${encodeURIComponent(agencyId)}/kill-switch/${action}`;
}

export function killSwitchActivateUrl(agencyId: string): string {
	return killSwitchMutationPath(agencyId, "activate");
}

export function killSwitchReleaseUrl(agencyId: string): string {
	return killSwitchMutationPath(agencyId, "release");
}

/** Institutional UUID for Idempotency-Key — one key per user intent, safe to retry. */
export function createKillSwitchMutationIdempotencyKey(): string {
	return crypto.randomUUID();
}

function errorMessageFromBody(body: unknown): string | null {
	if (typeof body !== "object" || body === null) {
		return null;
	}
	if ("error" in body && typeof body.error === "object" && body.error !== null) {
		const error = body.error as { message?: unknown };
		if (typeof error.message === "string" && error.message.length > 0) {
			return error.message;
		}
	}
	if ("message" in body && typeof body.message === "string") {
		return body.message;
	}
	return null;
}

function isRevisionConflictBody(body: unknown): boolean {
	if (typeof body !== "object" || body === null) {
		return false;
	}
	if ("error" in body && typeof body.error === "object" && body.error !== null) {
		const details = (body.error as { details?: { code?: unknown } }).details;
		if (
			details?.code === "RK_PERMIT_STALE" ||
			details?.code === "RK_POLICY_STALE"
		) {
			return true;
		}
		const code = (body.error as { code?: unknown }).code;
		if (code === "CONFLICT") {
			const message = (body.error as { message?: string }).message ?? "";
			return (
				message.toLowerCase().includes("epoch") ||
				message.toLowerCase().includes("stale")
			);
		}
	}
	return false;
}

/**
 * Maps a live POST response. Never invents success — malformed JSON is stale.
 */
export function killSwitchMutationOutcomeFromResponse(
	status: number,
	body: unknown,
): KillSwitchMutationOutcome {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 409 || isRevisionConflictBody(body)) {
		return { kind: "revision_conflict", status };
	}
	if (status === 400 || status === 422) {
		return {
			kind: "validation_error",
			status,
			message:
				errorMessageFromBody(body) ??
				"Comando de kill switch rejeitado pela validação do boundary.",
		};
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = riskCommandResultSchema.safeParse(body);
	if (!parsed.success) {
		return { kind: "stale", status };
	}
	return {
		kind: "success",
		result: parsed.data,
		idempotentReplay: parsed.data.idempotentReplay === true,
		status,
	};
}

const actorSchema = z.string().min(1).max(128);
const activateReasonSchema = z.string().min(1).max(512);

export function killSwitchActivateFieldsValid(
	reason: string,
	activatedBy: string,
): boolean {
	return (
		activateReasonSchema.safeParse(reason.trim()).success &&
		actorSchema.safeParse(activatedBy.trim()).success
	);
}

export function killSwitchReleaseFieldsValid(releasedBy: string): boolean {
	return actorSchema.safeParse(releasedBy.trim()).success;
}

export function killSwitchActivateSubmitDisabled(input: {
	busy: boolean;
	reason: string;
	activatedBy: string;
}): boolean {
	return (
		input.busy ||
		!killSwitchActivateFieldsValid(input.reason, input.activatedBy)
	);
}

export function killSwitchReleaseSubmitDisabled(input: {
	busy: boolean;
	releasedBy: string;
}): boolean {
	return input.busy || !killSwitchReleaseFieldsValid(input.releasedBy);
}

export function killSwitchMutationActionLabel(
	action: KillSwitchMutationAction,
): string {
	switch (action) {
		case "activate":
			return "Ativar kill switch";
		case "release":
			return "Liberar kill switch";
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

export function killSwitchMutationIsDestructive(
	action: KillSwitchMutationAction,
): boolean {
	return action === "activate";
}

export function killSwitchMutationOutcomeMessage(
	outcome: KillSwitchMutationOutcome,
): string {
	switch (outcome.kind) {
		case "success":
			return outcome.idempotentReplay
				? "Comando de kill switch já havia sido aplicado (replay idempotente)."
				: `Comando aceito — revisão ${String(outcome.result.revision)}${
						outcome.result.killSwitchActive !== undefined
							? ` · ativo=${String(outcome.result.killSwitchActive)}`
							: ""
					}.`;
		case "denied":
			return `Comando negado (HTTP ${String(outcome.status)}). Operator+ e sessão válida são exigidos.`;
		case "revision_conflict":
			return `Conflito de epoch ou estado (HTTP ${String(outcome.status)}). Atualize o painel e tente novamente.`;
		case "validation_error":
			return outcome.message;
		case "stale":
			return "Resposta inesperada do boundary de risk — nenhum estado local foi alterado.";
		default: {
			const _exhaustive: never = outcome;
			return _exhaustive;
		}
	}
}

async function postKillSwitchMutation(
	url: string,
	body: KillSwitchActivateBody | KillSwitchReleaseBody,
	idempotencyKey: string,
	fetchFn: KillSwitchMutationFetchFn,
): Promise<KillSwitchMutationOutcome> {
	let response: Response;
	try {
		response = await fetchFn(url, {
			method: "POST",
			credentials: "include",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				"Idempotency-Key": idempotencyKey,
			},
			body: JSON.stringify(body),
		});
	} catch {
		return { kind: "stale", status: null };
	}

	let parsedBody: unknown = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			parsedBody = await response.json();
		} catch {
			return { kind: "stale", status: response.status };
		}
	}

	return killSwitchMutationOutcomeFromResponse(response.status, parsedBody);
}

export async function executeKillSwitchActivate(
	agencyId: string,
	body: KillSwitchActivateBody,
	idempotencyKey: string,
	fetchFn: KillSwitchMutationFetchFn = fetch,
): Promise<KillSwitchMutationOutcome> {
	return postKillSwitchMutation(
		killSwitchActivateUrl(agencyId),
		{
			...body,
			scope: body.scope ?? "ORGANIZATION",
		},
		idempotencyKey,
		fetchFn,
	);
}

export async function executeKillSwitchRelease(
	agencyId: string,
	body: KillSwitchReleaseBody,
	idempotencyKey: string,
	fetchFn: KillSwitchMutationFetchFn = fetch,
): Promise<KillSwitchMutationOutcome> {
	return postKillSwitchMutation(
		killSwitchReleaseUrl(agencyId),
		{
			...body,
			scope: body.scope ?? "ORGANIZATION",
		},
		idempotencyKey,
		fetchFn,
	);
}

export async function executeKillSwitchMutation(
	agencyId: string,
	action: KillSwitchMutationAction,
	body: KillSwitchActivateBody | KillSwitchReleaseBody,
	idempotencyKey: string,
	fetchFn: KillSwitchMutationFetchFn = fetch,
): Promise<KillSwitchMutationOutcome> {
	switch (action) {
		case "activate":
			return executeKillSwitchActivate(
				agencyId,
				body as KillSwitchActivateBody,
				idempotencyKey,
				fetchFn,
			);
		case "release":
			return executeKillSwitchRelease(
				agencyId,
				body as KillSwitchReleaseBody,
				idempotencyKey,
				fetchFn,
			);
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}
