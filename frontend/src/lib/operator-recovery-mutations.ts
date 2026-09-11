import { z } from "zod";
import type { RecoveryTaskItem } from "./operator-recovery-tasks.ts";

export const RECOVERY_TASK_MUTATIONS_CONTRACT =
	"POST /v1/operations/agencies/:agencyId/recovery-tasks/:recoveryTaskId/{approve|start-execution|complete|fail|cancel}. createOperationsPlugin + Idempotency-Key (institutional UUID). DTO operationsCommandResultSchema em @anxionos/contracts/operations.";

const operationsCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	recoveryTaskId: z
		.string()
		.regex(/^ops_rcv_[0-9a-f-]{36}$/i)
		.optional(),
});

export type RecoveryCommandResult = z.infer<typeof operationsCommandResultSchema>;

export type RecoveryMutationAction =
	| "approve"
	| "start-execution"
	| "complete"
	| "fail"
	| "cancel";

export type RecoveryMutationOutcome =
	| {
			kind: "success";
			result: RecoveryCommandResult;
			idempotentReplay: boolean;
			status: number;
		}
	| { kind: "denied"; status: number }
	| { kind: "revision_conflict"; status: number }
	| { kind: "validation_error"; status: number; message: string }
	| { kind: "stale"; status: number | null };

export type RecoveryMutationFetchFn = typeof fetch;

export type RecoveryMutationBody = {
	expectedRevision: number;
	failureReason?: string;
	cancelReason?: string;
};

function recoveryTaskMutationPath(
	agencyId: string,
	recoveryTaskId: string,
	action: RecoveryMutationAction,
): string {
	return `/v1/operations/agencies/${encodeURIComponent(agencyId)}/recovery-tasks/${encodeURIComponent(recoveryTaskId)}/${action}`;
}

export function recoveryTaskApproveUrl(
	agencyId: string,
	recoveryTaskId: string,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, "approve");
}

export function recoveryTaskStartExecutionUrl(
	agencyId: string,
	recoveryTaskId: string,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, "start-execution");
}

export function recoveryTaskCompleteUrl(
	agencyId: string,
	recoveryTaskId: string,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, "complete");
}

export function recoveryTaskFailUrl(
	agencyId: string,
	recoveryTaskId: string,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, "fail");
}

export function recoveryTaskCancelUrl(
	agencyId: string,
	recoveryTaskId: string,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, "cancel");
}

export function recoveryMutationUrl(
	agencyId: string,
	recoveryTaskId: string,
	action: RecoveryMutationAction,
): string {
	return recoveryTaskMutationPath(agencyId, recoveryTaskId, action);
}

/** Institutional UUID for Idempotency-Key — one key per user intent, safe to retry. */
export function createRecoveryMutationIdempotencyKey(): string {
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
		if (details?.code === "OPS_REVISION_CONFLICT") {
			return true;
		}
		const code = (body.error as { code?: unknown }).code;
		if (code === "CONFLICT") {
			const message = (body.error as { message?: string }).message ?? "";
			return message.toLowerCase().includes("revision");
		}
	}
	return false;
}

/**
 * Maps a live POST response. Never invents success — malformed JSON is stale.
 */
export function recoveryMutationOutcomeFromResponse(
	status: number,
	body: unknown,
): RecoveryMutationOutcome {
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
				"Comando de recovery task rejeitado pela validação do boundary.",
		};
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const parsed = operationsCommandResultSchema.safeParse(body);
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

async function postRecoveryMutation(
	url: string,
	body: RecoveryMutationBody,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn,
): Promise<RecoveryMutationOutcome> {
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

	return recoveryMutationOutcomeFromResponse(response.status, parsedBody);
}

export async function approveRecoveryTask(
	agencyId: string,
	recoveryTaskId: string,
	body: Pick<RecoveryMutationBody, "expectedRevision">,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	return postRecoveryMutation(
		recoveryTaskApproveUrl(agencyId, recoveryTaskId),
		body,
		idempotencyKey,
		fetchFn,
	);
}

export async function startRecoveryTaskExecution(
	agencyId: string,
	recoveryTaskId: string,
	body: Pick<RecoveryMutationBody, "expectedRevision">,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	return postRecoveryMutation(
		recoveryTaskStartExecutionUrl(agencyId, recoveryTaskId),
		body,
		idempotencyKey,
		fetchFn,
	);
}

export async function completeRecoveryTask(
	agencyId: string,
	recoveryTaskId: string,
	body: Pick<RecoveryMutationBody, "expectedRevision">,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	return postRecoveryMutation(
		recoveryTaskCompleteUrl(agencyId, recoveryTaskId),
		body,
		idempotencyKey,
		fetchFn,
	);
}

export async function failRecoveryTask(
	agencyId: string,
	recoveryTaskId: string,
	body: Pick<RecoveryMutationBody, "expectedRevision" | "failureReason">,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	return postRecoveryMutation(
		recoveryTaskFailUrl(agencyId, recoveryTaskId),
		body,
		idempotencyKey,
		fetchFn,
	);
}

export async function cancelRecoveryTask(
	agencyId: string,
	recoveryTaskId: string,
	body: Pick<RecoveryMutationBody, "expectedRevision" | "cancelReason">,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	return postRecoveryMutation(
		recoveryTaskCancelUrl(agencyId, recoveryTaskId),
		body,
		idempotencyKey,
		fetchFn,
	);
}

export async function executeRecoveryTaskMutation(
	agencyId: string,
	recoveryTaskId: string,
	action: RecoveryMutationAction,
	body: RecoveryMutationBody,
	idempotencyKey: string,
	fetchFn: RecoveryMutationFetchFn = fetch,
): Promise<RecoveryMutationOutcome> {
	switch (action) {
		case "approve":
			return approveRecoveryTask(
				agencyId,
				recoveryTaskId,
				body,
				idempotencyKey,
				fetchFn,
			);
		case "start-execution":
			return startRecoveryTaskExecution(
				agencyId,
				recoveryTaskId,
				body,
				idempotencyKey,
				fetchFn,
			);
		case "complete":
			return completeRecoveryTask(
				agencyId,
				recoveryTaskId,
				body,
				idempotencyKey,
				fetchFn,
			);
		case "fail":
			return failRecoveryTask(
				agencyId,
				recoveryTaskId,
				body,
				idempotencyKey,
				fetchFn,
			);
		case "cancel":
			return cancelRecoveryTask(
				agencyId,
				recoveryTaskId,
				body,
				idempotencyKey,
				fetchFn,
			);
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

/** Contextual mutations exposed in Operator console — aligned with recovery lifecycle. */
export function recoveryTaskAvailableMutations(
	task: RecoveryTaskItem,
): RecoveryMutationAction[] {
	switch (task.status) {
		case "AWAITING_APPROVAL":
			return ["approve", "cancel"];
		case "PENDING":
		case "APPROVED":
			return ["start-execution", "cancel"];
		case "IN_PROGRESS":
			return ["complete", "fail", "cancel"];
		case "COMPLETED":
		case "FAILED":
		case "CANCELLED":
			return [];
		default: {
			const _exhaustive: never = task.status;
			return _exhaustive;
		}
	}
}

export function recoveryMutationActionLabel(action: RecoveryMutationAction): string {
	switch (action) {
		case "approve":
			return "Aprovar";
		case "start-execution":
			return "Iniciar execução";
		case "complete":
			return "Concluir";
		case "fail":
			return "Marcar falha";
		case "cancel":
			return "Cancelar";
		default: {
			const _exhaustive: never = action;
			return _exhaustive;
		}
	}
}

export function recoveryMutationOutcomeMessage(
	outcome: RecoveryMutationOutcome,
): string {
	switch (outcome.kind) {
		case "success":
			return outcome.idempotentReplay
				? "Comando já havia sido aplicado (replay idempotente)."
				: `Comando aceito — revisão ${String(outcome.result.revision)}.`;
		case "denied":
			return `Comando negado (HTTP ${String(outcome.status)}). Operator+ e sessão válida são exigidos.`;
		case "revision_conflict":
			return `Conflito de revisão (HTTP ${String(outcome.status)}). Atualize a lista e tente novamente.`;
		case "validation_error":
			return outcome.message;
		case "stale":
			return "Resposta inesperada do boundary de operations — nenhum estado local foi alterado.";
		default: {
			const _exhaustive: never = outcome;
			return _exhaustive;
		}
	}
}

export function recoveryMutationRequiresReason(
	action: RecoveryMutationAction,
): "failureReason" | "cancelReason" | null {
	if (action === "fail") {
		return "failureReason";
	}
	if (action === "cancel") {
		return "cancelReason";
	}
	return null;
}

export function recoveryMutationIsDestructive(action: RecoveryMutationAction): boolean {
	return action === "fail" || action === "cancel";
}
