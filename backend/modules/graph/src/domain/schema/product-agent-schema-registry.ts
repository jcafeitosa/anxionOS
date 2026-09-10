import {
	AGENT_GRAPH_EDGE_TYPES,
	AGENT_GRAPH_NODE_TYPES,
	PRODUCT_GRAPH_EDGE_TYPES,
	PRODUCT_GRAPH_NODE_TYPES,
} from "@anxionos/contracts/graph";
import { GraphSchemaRegistryError } from "./errors";
import {
	createGraphSchemaRegistry,
	type GraphSchemaRegistry,
} from "./registry";

export const PRODUCT_GRAPH_OWNER_DOMAIN = "product";
export const AGENT_GRAPH_OWNER_DOMAIN = "agents";

export function createProductGraphSchemaRegistry(): GraphSchemaRegistry {
	return createGraphSchemaRegistry({
		nodeTypes: PRODUCT_GRAPH_NODE_TYPES,
		edgeTypes: PRODUCT_GRAPH_EDGE_TYPES,
	});
}

export function createAgentGraphSchemaRegistry(): GraphSchemaRegistry {
	return createGraphSchemaRegistry({
		nodeTypes: AGENT_GRAPH_NODE_TYPES,
		edgeTypes: AGENT_GRAPH_EDGE_TYPES,
	});
}

export function createProductAgentGraphSchemaRegistry(): GraphSchemaRegistry {
	const nodeTypes = [...PRODUCT_GRAPH_NODE_TYPES, ...AGENT_GRAPH_NODE_TYPES];
	const seen = new Set<string>();
	for (const def of nodeTypes) {
		const key = `${def.nodeType}:${def.schemaVersion}`;
		if (seen.has(key)) {
			throw new GraphSchemaRegistryError(
				"DUPLICATE_NODE_TYPE",
				`Cannot merge Product+Agent registries: duplicate node type ${key}`,
			);
		}
		seen.add(key);
	}
	return createGraphSchemaRegistry({
		nodeTypes,
		edgeTypes: [...PRODUCT_GRAPH_EDGE_TYPES, ...AGENT_GRAPH_EDGE_TYPES],
	});
}
