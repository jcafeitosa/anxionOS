import { z } from "zod";

export const OPERATIONS_RECOVERY_TASKS_COLLECTION_PATH =
	"/v1/operations/agencies/:agencyId/incidents/:incidentId/recovery-tasks";

/** Public operations query — recovery tasks for an incident (ANX-165 S2). */
export const RECOVERY_TASKS_COLLECTION_CONTRACT =
	"GET /v1/operations/agencies/:agencyId/incidents/:incidentId/recovery-tasks (collection). createOperationsPlugin handleListRecoveryTasksByIncident → listRecoveryTasksByIncident; DTO recoveryTaskSnapshotSchema em @anxionos/contracts/operations. Mutations: operator-recovery-mutations.ts (operator+ e Idempotency-Key).";

const recoveryStepKindSchema = z.enum([
	"VALIDATE_SCHEMA",
	"CHECK_CHECKPOINT",
	"VERIFY_INTEGRITY",
	"RESTORE_DATABASE",
	"REPLAY_OUTBOX",
	"REBUILD_PROJECTION",
	"PURGE_QUEUE",
]);

const recoveryTaskStatusSchema = z.enum([
	"PENDING",
	"AWAITING_APPROVAL",
	"APPROVED",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
	"CANCELLED",
]);

export const recoveryTaskItemSchema = z.object({
	recoveryTaskId: z.string().regex(/^ops_rcv_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
	incidentId: z.string().regex(/^ops_inc_[0-9a-f-]{36}$/i),
	stepKind: recoveryStepKindSchema,
	status: recoveryTaskStatusSchema,
	stepRequiresApproval: z.boolean(),
	hasRequiredApproval: z.boolean(),
	startedAt: z.string().datetime(),
	revision: z.number().int().positive(),
	initiatedByPrincipalId: z.string().uuid().nullable(),
});

export type RecoveryTaskItem = z.infer<typeof recoveryTaskItemSchema>;

const collectionBodySchema = z.union([
	z.array(recoveryTaskItemSchema),
	z.object({ recoveryTasks: z.array(recoveryTaskItemSchema) }),
	z.object({ items: z.array(recoveryTaskItemSchema) }),
]);

export type IncidentRecoveryTasksView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly RecoveryTaskItem[] }
	| {
			kind: "empty";
			reason: "no_recovery_tasks" | "collection_unavailable";
			status: number;
		}
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type IncidentRecoveryTasksFetchFn = typeof fetch;

export function incidentRecoveryTasksCollectionUrl(
	agencyId: string,
	incidentId: string,
): string {
	return `/v1/operations/agencies/${encodeURIComponent(agencyId)}/incidents/${encodeURIComponent(incidentId)}/recovery-tasks`;
}

function itemsFromBody(body: unknown): RecoveryTaskItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("recoveryTasks" in parsed.data) {
		return parsed.data.recoveryTasks;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of recovery tasks for an incident. 404/405 mean the
 * public list surface is absent — honest empty, not a mock queue.
 */
export function recoveryTasksViewFromResponse(
	status: number,
	body: unknown,
): Exclude<IncidentRecoveryTasksView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const items = itemsFromBody(body);
	if (items === null) {
		return { kind: "stale", status };
	}
	if (items.length === 0) {
		return { kind: "empty", reason: "no_recovery_tasks", status };
	}
	return { kind: "ready", items };
}

export async function fetchIncidentRecoveryTasks(
	agencyId: string,
	incidentId: string,
	fetchFn: IncidentRecoveryTasksFetchFn = fetch,
): Promise<Exclude<IncidentRecoveryTasksView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(
			incidentRecoveryTasksCollectionUrl(agencyId, incidentId),
			{
				credentials: "include",
				headers: { Accept: "application/json" },
			},
		);
	} catch {
		return { kind: "stale", status: null };
	}

	let body: unknown = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			body = await response.json();
		} catch {
			return { kind: "stale", status: response.status };
		}
	}

	return recoveryTasksViewFromResponse(response.status, body);
}

export function recoveryTaskEmptyDescription(
	reason: "no_recovery_tasks" | "collection_unavailable",
): string {
	if (reason === "no_recovery_tasks") {
		return `Nenhuma recovery task vinculada a este incidente. Contrato: ${RECOVERY_TASKS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${RECOVERY_TASKS_COLLECTION_CONTRACT}`;
}

export function recoveryTaskDisplayLabel(item: RecoveryTaskItem): string {
	const approval =
		item.stepRequiresApproval && !item.hasRequiredApproval
			? " · aprovação pendente"
			: "";
	return `${item.stepKind} · ${item.status}${approval}`;
}
