import {
	catalogViewFromResponse,
	fetchAgencyAgentsCatalog,
	type AgencyAgentsCatalogView,
	type AgentCatalogItem,
} from "./agency-agents-catalog.ts";
import {
	autonomyViewFromResponse,
	fetchAgentsAutonomy,
	type AgentAutonomyView,
} from "./owner-agent-autonomy.ts";

export const TAKEOVER_AGENTS_COLLECTION_PATH = "/v1/agencies/:agencyId/agents";

export const TAKEOVER_AUTONOMY_PATH =
	"/v1/agencies/:agencyId/agents/:agentId/autonomy";

/** Read-only operator takeover shell — agents + effective autonomy (ANX-165 S5). */
export const TAKEOVER_READ_CONTRACT =
	"GET /v1/agencies/:agencyId/agents (collection) + GET /v1/agencies/:agencyId/agents/:agentId/autonomy por agente. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. Operator console não inventa agentes nem níveis.";

/** @deprecated Import TAKEOVER_MUTATION_CONTRACT from operator-takeover-mutations.ts */
export { TAKEOVER_MUTATION_CONTRACT } from "./operator-takeover-mutations.ts";

export type OperatorTakeoverCatalogView = Exclude<
	AgencyAgentsCatalogView,
	{ kind: "loading" }
>;

export type OperatorTakeoverAutonomyMap = Record<
	string,
	Exclude<AgentAutonomyView, { kind: "loading" }>
>;

export type OperatorTakeoverSnapshotView =
	| Exclude<OperatorTakeoverCatalogView, { kind: "ready" }>
	| {
			kind: "loaded";
			agents: readonly AgentCatalogItem[];
			autonomyByAgent: OperatorTakeoverAutonomyMap;
	  };

export type OperatorTakeoverFetchFn = typeof fetch;

export function takeoverEmptyDescription(
	reason: "no_agents" | "collection_unavailable",
): string {
	if (reason === "no_agents") {
		return `Nenhum agente elegível para takeover nesta agência. Contrato leitura: ${TAKEOVER_READ_CONTRACT}`;
	}
	return `Listagem de agentes ainda não publicada. ${TAKEOVER_READ_CONTRACT}`;
}

export function takeoverAgentDisplayLabel(agent: AgentCatalogItem): string {
	return `${agent.displayName} · ${agent.kind} · ${agent.status}`;
}

/**
 * Maps catalog + per-agent autonomy into a single ready snapshot.
 * Catalog errors propagate; autonomy is fetched only when catalog is ready.
 */
export async function fetchOperatorTakeoverSnapshot(
	agencyId: string,
	fetchFn: OperatorTakeoverFetchFn = fetch,
): Promise<OperatorTakeoverSnapshotView> {
	const catalog = await fetchAgencyAgentsCatalog(agencyId, fetchFn);
	if (catalog.kind !== "ready") {
		return catalog;
	}
	if (catalog.items.length === 0) {
		return { kind: "empty", reason: "no_agents", status: 200 };
	}
	const autonomyByAgent = await fetchAgentsAutonomy(
		agencyId,
		catalog.items.map((agent) => agent.id),
		fetchFn,
	);
	return { kind: "loaded", agents: catalog.items, autonomyByAgent };
}

export {
	autonomyViewFromResponse,
	catalogViewFromResponse,
	fetchAgencyAgentsCatalog,
	fetchAgentsAutonomy,
};
