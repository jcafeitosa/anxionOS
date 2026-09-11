import { z } from "zod";

export const AGENCY_AGENTS_COLLECTION_PATH =
	"/v1/agencies/:agencyId/agents";

/** Cite the missing collection GET — never invent rows. */
export const AGENTS_COLLECTION_CONTRACT =
	"GET /v1/agencies/:agencyId/agents (collection). createAgentsPlugin só POST \"\" + GET /:agentId; AgentRepository.save/findById sem listByOrganization; OpenAPI getAgent/listAgentVersions (por agentId). ANX-143 done não publica listagem. ANX-385.";

export const agentCatalogItemSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid().optional(),
	agencyId: z.string().uuid().nullable().optional(),
	kind: z.string().min(1),
	displayName: z.string().min(1),
	status: z.string().min(1),
	activeVersionId: z.string().uuid().nullable().optional(),
	revision: z.number().int().optional(),
});

export type AgentCatalogItem = z.infer<typeof agentCatalogItemSchema>;

const collectionBodySchema = z.union([
	z.array(agentCatalogItemSchema),
	z.object({ agents: z.array(agentCatalogItemSchema) }),
	z.object({ items: z.array(agentCatalogItemSchema) }),
]);

export type AgencyAgentsCatalogView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly AgentCatalogItem[] }
	| { kind: "empty"; reason: "no_agents" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyAgentsFetchFn = typeof fetch;

export function agencyAgentsCollectionUrl(agencyId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/agents`;
}

function itemsFromBody(body: unknown): AgentCatalogItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("agents" in parsed.data) {
		return parsed.data.agents;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency agents collection. 404/405 mean the public
 * list surface is absent — honest empty, not a mock table.
 */
export function catalogViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyAgentsCatalogView, { kind: "loading" }> {
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
		return { kind: "empty", reason: "no_agents", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyAgentsCatalog(
	agencyId: string,
	fetchFn: AgencyAgentsFetchFn = fetch,
): Promise<Exclude<AgencyAgentsCatalogView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyAgentsCollectionUrl(agencyId), {
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

	return catalogViewFromResponse(response.status, body);
}

export function catalogEmptyDescription(
	reason: "no_agents" | "collection_unavailable",
): string {
	if (reason === "no_agents") {
		return `Nenhum agente registado nesta agência. Contrato: ${AGENTS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${AGENTS_COLLECTION_CONTRACT}`;
}
