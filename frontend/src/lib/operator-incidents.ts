import { z } from "zod";

export const OPERATIONS_INCIDENTS_COLLECTION_PATH =
	"/v1/operations/agencies/:agencyId/incidents";

/** Public operations query — incidents for agency scope (ANX-158 / ANX-165). */
export const INCIDENTS_COLLECTION_CONTRACT =
	"GET /v1/operations/agencies/:agencyId/incidents (collection). createOperationsPlugin handleListIncidents → listIncidents; DTO incidentSnapshotSchema em @anxionos/contracts/operations. Mutations exigem operator+ e Idempotency-Key.";

const incidentSeveritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const incidentStatusSchema = z.enum([
	"OPEN",
	"ACKNOWLEDGED",
	"INVESTIGATING",
	"MITIGATING",
	"ESCALATED",
	"RESOLVED",
	"CLOSED",
]);

export const incidentItemSchema = z.object({
	incidentId: z.string().regex(/^ops_inc_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
	title: z.string().min(1).max(256),
	description: z.string().max(4096).nullable(),
	severity: incidentSeveritySchema,
	status: incidentStatusSchema,
	serviceId: z.string().min(1).max(128).nullable(),
	openedAt: z.string().datetime(),
	revision: z.number().int().positive(),
	runbookId: z
		.string()
		.regex(/^ops_rnb_[0-9a-f-]{36}$/i)
		.nullable(),
	runbookVersion: z.string().min(1).max(64).nullable(),
	runbookAttachedAt: z.string().datetime().nullable(),
	responsiblePrincipalId: z.string().uuid().nullable(),
	resolvedAt: z.string().datetime().nullable(),
	closedAt: z.string().datetime().nullable(),
});

export type IncidentItem = z.infer<typeof incidentItemSchema>;

const collectionBodySchema = z.union([
	z.array(incidentItemSchema),
	z.object({ incidents: z.array(incidentItemSchema) }),
	z.object({ items: z.array(incidentItemSchema) }),
]);

export type AgencyIncidentsView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly IncidentItem[] }
	| { kind: "empty"; reason: "no_incidents" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyIncidentsFetchFn = typeof fetch;

export function agencyIncidentsCollectionUrl(agencyId: string): string {
	return `/v1/operations/agencies/${encodeURIComponent(agencyId)}/incidents`;
}

function itemsFromBody(body: unknown): IncidentItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("incidents" in parsed.data) {
		return parsed.data.incidents;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency incidents collection. 404/405 mean the
 * public list surface is absent — honest empty, not a mock queue.
 */
export function incidentsViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyIncidentsView, { kind: "loading" }> {
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
		return { kind: "empty", reason: "no_incidents", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyIncidents(
	agencyId: string,
	fetchFn: AgencyIncidentsFetchFn = fetch,
): Promise<Exclude<AgencyIncidentsView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyIncidentsCollectionUrl(agencyId), {
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

	return incidentsViewFromResponse(response.status, body);
}

export function incidentEmptyDescription(
	reason: "no_incidents" | "collection_unavailable",
): string {
	if (reason === "no_incidents") {
		return `Nenhum incidente aberto nesta agência. Contrato: ${INCIDENTS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${INCIDENTS_COLLECTION_CONTRACT}`;
}

export function incidentDisplayLabel(item: IncidentItem): string {
	return `${item.severity} · ${item.status} · ${item.title}`;
}
