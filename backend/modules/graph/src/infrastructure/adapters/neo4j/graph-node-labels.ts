/**
 * ANX-277 — Neo4j secondary labels (`ProductGraph_Node`, `AgentGraph_Node`).
 * Importers: `graph-store-adapter.ts` (upsert/get).
 * User instruction: "especificar o Product Graph/Agent Graph como sistema operacional cognitivo" + ANX-277 sandbox projection worker.
 */
const PRODUCT_GRAPH_LABEL = "ProductGraph_Node";
const AGENT_GRAPH_LABEL = "AgentGraph_Node";

export function resolveNeo4jGraphLabels(ownerDomain: string): string[] {
	switch (ownerDomain) {
		case "product":
			return ["GraphNode", PRODUCT_GRAPH_LABEL];
		case "agents":
			return ["GraphNode", AGENT_GRAPH_LABEL];
		default:
			return ["GraphNode"];
	}
}

export function formatNeo4jLabelClause(labels: string[]): string {
	return labels.map((label) => `:${label}`).join("");
}
