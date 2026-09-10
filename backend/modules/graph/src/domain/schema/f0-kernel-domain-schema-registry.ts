import {
	AGENT_GRAPH_EDGE_TYPES,
	AGENT_GRAPH_NODE_TYPES,
	GRAPH_DOMAIN_TRAVERSAL_EDGE_TYPES,
	GRAPH_DOMAIN_TRAVERSAL_NODE_TYPES,
	GRAPH_F0_EDGE_TYPES,
	GRAPH_F0_NODE_TYPES,
	GRAPH_KERNEL_EDGE_TYPES,
	GRAPH_KERNEL_NODE_TYPES,
	PRODUCT_GRAPH_EDGE_TYPES,
	PRODUCT_GRAPH_NODE_TYPES,
} from "@anxionos/contracts/graph";
import { createGraphSchemaRegistry, type GraphSchemaRegistry } from "./registry";

/** F0 + kernel + product/agent + domain traversal types for owner-consumer catalog. */
export function createF0KernelDomainGraphSchemaRegistry(): GraphSchemaRegistry {
	return createGraphSchemaRegistry({
		nodeTypes: [
			...GRAPH_F0_NODE_TYPES,
			...GRAPH_KERNEL_NODE_TYPES,
			...GRAPH_DOMAIN_TRAVERSAL_NODE_TYPES,
			...PRODUCT_GRAPH_NODE_TYPES,
			...AGENT_GRAPH_NODE_TYPES,
		],
		edgeTypes: [
			...GRAPH_F0_EDGE_TYPES,
			...GRAPH_KERNEL_EDGE_TYPES,
			...GRAPH_DOMAIN_TRAVERSAL_EDGE_TYPES,
			...PRODUCT_GRAPH_EDGE_TYPES,
			...AGENT_GRAPH_EDGE_TYPES,
		],
	});
}
