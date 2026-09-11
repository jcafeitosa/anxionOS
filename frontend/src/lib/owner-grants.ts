import { z } from "zod";

export const AGENCY_GRANTS_COLLECTION_PATH = "/v1/agencies/:agencyId/grants";

/** Public governance query — effective grants for the session principal in agency scope. */
export const GRANTS_COLLECTION_CONTRACT =
	"GET /v1/agencies/:agencyId/grants (collection). createGovernancePlugin handleListGrants → listEffectiveGrants; DTO em handlers/grants toGrantDto. Autonomia L0–L4 por agente: GET /v1/agencies/:agencyId/agents/:agentId/autonomy. ANX-402 slice 3.";

const grantStatusSchema = z.enum(["active", "revoked", "expired"]);

export const grantItemSchema = z.object({
	id: z.string().uuid(),
	scopeId: z.string().uuid(),
	granteePrincipalId: z.string().uuid(),
	capability: z.string().min(1),
	status: grantStatusSchema,
	validFrom: z.string().datetime(),
	validUntil: z.string().datetime().nullable(),
	authorityEpochAtIssue: z.number().int().nonnegative(),
	revision: z.number().int().nonnegative(),
});

export type GrantItem = z.infer<typeof grantItemSchema>;

const collectionBodySchema = z.union([
	z.array(grantItemSchema),
	z.object({ grants: z.array(grantItemSchema) }),
	z.object({ items: z.array(grantItemSchema) }),
]);

export type AgencyGrantsView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly GrantItem[] }
	| { kind: "empty"; reason: "no_grants" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyGrantsFetchFn = typeof fetch;

export function agencyGrantsCollectionUrl(agencyId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/grants`;
}

function itemsFromBody(body: unknown): GrantItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("grants" in parsed.data) {
		return parsed.data.grants;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency grants collection. 404/405 mean the public
 * list surface is absent — honest empty, not a mock table.
 */
export function grantsViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyGrantsView, { kind: "loading" }> {
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
		return { kind: "empty", reason: "no_grants", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyGrants(
	agencyId: string,
	fetchFn: AgencyGrantsFetchFn = fetch,
): Promise<Exclude<AgencyGrantsView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyGrantsCollectionUrl(agencyId), {
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

	return grantsViewFromResponse(response.status, body);
}

export function grantEmptyDescription(
	reason: "no_grants" | "collection_unavailable",
): string {
	if (reason === "no_grants") {
		return `Nenhum grant efetivo para o principal nesta agência. Contrato: ${GRANTS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${GRANTS_COLLECTION_CONTRACT}`;
}

export function grantDisplayLabel(item: GrantItem): string {
	return `${item.capability} · ${item.status}`;
}

export { AUTONOMY_PER_AGENT_CONTRACT } from "./owner-agent-autonomy.ts";
