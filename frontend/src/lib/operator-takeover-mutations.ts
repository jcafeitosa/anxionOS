import { z } from "zod";
import type { AgentCatalogItem } from "./agency-agents-catalog.ts";
import type { AgentAutonomyView } from "./owner-agent-autonomy.ts";

export const TAKEOVER_MUTATION_CONTRACT =
	"POST /v1/agencies/:agencyId/agents/:agentId/autonomy/transition — transitionKind: takeover, targetLevel (L2 operator), evidenceHash, approvalId. Idempotency-Key (institutional UUID). DTO governanceCommandResultSchema em @anxionos/contracts/governance.";

/** Operator takeover ceiling per governance normative matrix (ANX-173). */
export const OPERATOR_TAKEOVER_TARGET_LEVEL = "L2" as const;

const governanceCommandResultSchema = z.object({
	aggregateId: z.string().uuid(),
	revision: z.number().int().nonnegative(),
	authorityEpoch: z.number().int().nonnegative().optional(),
	idempotentReplay: z.boolean().optional(),
});

export type TakeoverCommandResult = z.infer<typeof governanceCommandResultSchema>;

export type TakeoverMutationOutcome =
	| {
			kind: "success";
			result: TakeoverCommandResult;
			idempotentReplay: boolean;
			status: number;
		}
	| { kind: "denied"; status: number }
	| { kind: "revision_conflict"; status: number }
	| { kind: "validation_error"; status: number; message: string }
	| { kind: "stale"; status: number | null };

export type TakeoverMutationFetchFn = typeof fetch;

export type TakeoverMutationBody = {
	targetLevel: typeof OPERATOR_TAKEOVER_TARGET_LEVEL;
	transitionKind: "takeover";
	evidenceHash: string;
	approvalId: string;
	reason?: string;
};

export function takeoverTransitionUrl(agencyId: string, agentId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/agents/${encodeURIComponent(agentId)}/autonomy/transition`;
}

/** Institutional UUID for Idempotency-Key — one key per user intent, safe to retry. */
export function createTakeoverMutationIdempotencyKey(): string {
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
			details?.code === "GOV_EPOCH_STALE" ||
			details?.code === "GOV_AUTONOMY_ASSIGNMENT_EXISTS"
		) {
			return true;
		}
		const code = (body.error as { code?: unknown }).code;
		if (code === "CONFLICT") {
			const message = (body.error as { message?: string }).message ?? "";
			return (
				message.toLowerCase().includes("revision") ||
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
export function takeoverMutationOutcomeFromResponse(
	status: number,
	body: unknown,
): TakeoverMutationOutcome {
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
				"Comando de takeover rejeitado pela validação do boundary.",
		};
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = governanceCommandResultSchema.safeParse(body);
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

const institutionalUuidSchema = z.string().uuid();

export function takeoverConfirmFieldsValid(
	approvalId: string,
	evidenceHash: string,
): boolean {
	return (
		institutionalUuidSchema.safeParse(approvalId.trim()).success &&
		evidenceHash.trim().length > 0
	);
}

export function takeoverConfirmSubmitDisabled(input: {
	busy: boolean;
	approvalId: string;
	evidenceHash: string;
}): boolean {
	return input.busy || !takeoverConfirmFieldsValid(input.approvalId, input.evidenceHash);
}

export type TakeoverEligibility =
	| { eligible: true }
	| { eligible: false; reason: string };

export function takeoverAgentEligibleForMutation(
	agent: AgentCatalogItem,
	autonomy: Exclude<AgentAutonomyView, { kind: "loading" }> | undefined,
): TakeoverEligibility {
	if (agent.status !== "ACTIVE") {
		return {
			eligible: false,
			reason: `Agente ${agent.status} — takeover exige status ACTIVE.`,
		};
	}
	if (!autonomy) {
		return {
			eligible: false,
			reason: "Aguardando autonomia efetiva antes de habilitar takeover.",
		};
	}
	if (autonomy.kind === "denied") {
		return {
			eligible: false,
			reason: `Autonomia negada (HTTP ${String(autonomy.status)}) — takeover indisponível.`,
		};
	}
	if (autonomy.kind === "stale") {
		return {
			eligible: false,
			reason: "Autonomia indisponível — takeover bloqueado até GET válido.",
		};
	}
	if (
		autonomy.kind === "ready" &&
		autonomy.level === OPERATOR_TAKEOVER_TARGET_LEVEL
	) {
		return {
			eligible: false,
			reason: `Agente já em ${OPERATOR_TAKEOVER_TARGET_LEVEL} — takeover não altera o nível.`,
		};
	}
	return { eligible: true };
}

export function takeoverMutationOutcomeMessage(
	outcome: TakeoverMutationOutcome,
): string {
	switch (outcome.kind) {
		case "success":
			return outcome.idempotentReplay
				? "Takeover já havia sido aplicado (replay idempotente)."
				: `Takeover aceito — revisão ${String(outcome.result.revision)}.`;
		case "denied":
			return `Takeover negado (HTTP ${String(outcome.status)}). Operator+ e sessão válida são exigidos.`;
		case "revision_conflict":
			return `Conflito de revisão ou epoch (HTTP ${String(outcome.status)}). Atualize a lista e tente novamente.`;
		case "validation_error":
			return outcome.message;
		case "stale":
			return "Resposta inesperada do boundary de governance — nenhum estado local foi alterado.";
		default: {
			const _exhaustive: never = outcome;
			return _exhaustive;
		}
	}
}

export async function executeOperatorTakeover(
	agencyId: string,
	agentId: string,
	body: TakeoverMutationBody,
	idempotencyKey: string,
	fetchFn: TakeoverMutationFetchFn = fetch,
): Promise<TakeoverMutationOutcome> {
	let response: Response;
	try {
		response = await fetchFn(takeoverTransitionUrl(agencyId, agentId), {
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

	return takeoverMutationOutcomeFromResponse(response.status, parsedBody);
}
