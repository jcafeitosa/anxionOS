import {
	GRAPH_DOMAIN_TRAVERSAL_EDGE_TYPES,
	GRAPH_DOMAIN_TRAVERSAL_NODE_TYPES,
	GRAPH_F0_EDGE_TYPES,
	GRAPH_F0_NODE_TYPES,
	GRAPH_KERNEL_EDGE_TYPES,
	GRAPH_KERNEL_NODE_TYPES,
} from "@anxionos/contracts/graph";
import {
	createGraphSchemaRegistry,
	type GraphSchemaRegistry,
} from "./registry";

/** F0 authorization + kernel + domain traversal types (ANX-303, ANX-305). */
export function createF0KernelGraphSchemaRegistry(): GraphSchemaRegistry {
	return createGraphSchemaRegistry({
		nodeTypes: [
			...GRAPH_F0_NODE_TYPES,
			...GRAPH_KERNEL_NODE_TYPES,
			...GRAPH_DOMAIN_TRAVERSAL_NODE_TYPES,
		],
		edgeTypes: [
			...GRAPH_F0_EDGE_TYPES,
			...GRAPH_KERNEL_EDGE_TYPES,
			...GRAPH_DOMAIN_TRAVERSAL_EDGE_TYPES,
		],
	});
}
