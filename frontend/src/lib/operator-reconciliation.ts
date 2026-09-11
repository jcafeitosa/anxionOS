import { z } from "zod";

export const EXECUTION_RECONCILIATION_COLLECTION_PATH =
	"/v1/execution/agencies/:agencyId/reconciliation-cases";

/** Public execution query — venue reconciliation cases for agency scope (ANX-165 S8). */
export const RECONCILIATION_COLLECTION_CONTRACT =
	"GET /v1/execution/agencies/:agencyId/reconciliation-cases (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionReconciliationCase*Schema em @anxionos/contracts/execution. Resolve mutations = slice futuro com Idempotency-Key.";

const executionReconciliationCaseKindSchema = z.enum([
	"ORDER_STATUS_MISMATCH",
	"FILL_MISSING",
	"DUPLICATE_VENUE_FILL",
]);

const executionReconciliationCaseStatusSchema = z.enum([
	"OPEN",
	"INVESTIGATING",
	"RESOLVED",
	"ESCALATED",
]);

const executionReconciliationDispositionSchema = z.enum([
	"LINKED_EXISTING_FILL",
	"IGNORED_DUPLICATE",
	"CONFIRMED_EXISTING",
	"MARKED_FAILED",
	"STATUS_ALIGNED",
	"FILL_RECORDED",
]);

export const reconciliationCaseItemSchema = z.object({
	reconciliationCaseId: z.string().regex(/^ex_rc_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
	caseKind: executionReconciliationCaseKindSchema,
	status: executionReconciliationCaseStatusSchema,
	orderId: z
		.string()
		.regex(/^ex_ord_[0-9a-f-]{36}$/i)
		.nullable()
		.optional(),
	fillId: z
		.string()
		.regex(/^ex_fill_[0-9a-f-]{36}$/i)
		.nullable()
		.optional(),
	venueAdapterRefId: z.string().min(1).max(128),
	venueFillId: z.string().min(1).max(256).nullable().optional(),
	evidence: z.string().max(4096).nullable().optional(),
	disposition: executionReconciliationDispositionSchema.nullable().optional(),
	dispositionRationale: z.string().max(1024).nullable().optional(),
	openedAt: z.string().datetime(),
	resolvedAt: z.string().datetime().nullable().optional(),
});

export type ReconciliationCaseItem = z.infer<typeof reconciliationCaseItemSchema>;

const collectionBodySchema = z.union([
	z.array(reconciliationCaseItemSchema),
	z.object({
		reconciliationCases: z.array(reconciliationCaseItemSchema),
	}),
	z.object({ items: z.array(reconciliationCaseItemSchema) }),
]);

export type AgencyReconciliationView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly ReconciliationCaseItem[] }
	| {
			kind: "empty";
			reason: "no_cases" | "collection_unavailable";
			status: number;
		}
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyReconciliationFetchFn = typeof fetch;

export function agencyReconciliationCollectionUrl(agencyId: string): string {
	return `/v1/execution/agencies/${encodeURIComponent(agencyId)}/reconciliation-cases`;
}

function itemsFromBody(body: unknown): ReconciliationCaseItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("reconciliationCases" in parsed.data) {
		return parsed.data.reconciliationCases;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency reconciliation-cases collection. 404/405 mean the
 * public list surface is absent — honest empty, not a mock queue.
 */
export function reconciliationViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyReconciliationView, { kind: "loading" }> {
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
		return { kind: "empty", reason: "no_cases", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyReconciliationCases(
	agencyId: string,
	fetchFn: AgencyReconciliationFetchFn = fetch,
): Promise<Exclude<AgencyReconciliationView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyReconciliationCollectionUrl(agencyId), {
			credentials: "include",
			headers: { Accept: "application/json" },
		});
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

	return reconciliationViewFromResponse(response.status, body);
}

export function reconciliationEmptyDescription(
	reason: "no_cases" | "collection_unavailable",
): string {
	if (reason === "no_cases") {
		return `Nenhum caso de reconciliação venue nesta agência. Contrato: ${RECONCILIATION_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${RECONCILIATION_COLLECTION_CONTRACT}`;
}

export function reconciliationDisplayLabel(item: ReconciliationCaseItem): string {
	return `${item.caseKind} · ${item.status} · ${item.reconciliationCaseId}`;
}
