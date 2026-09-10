import type { EdgeTypeDef, NodeTypeDef } from "@anxionos/contracts/graph";
import { GraphSchemaRegistryError } from "./errors";

export const GRAPH_MODULE_OWNER_DOMAIN = "graph";
function nodeKey(nodeType, schemaVersion) {
	return `${nodeType}:${schemaVersion}`;
}
export function createGraphSchemaRegistry(
	input: GraphSchemaRegistryInput,
): GraphSchemaRegistry {
	const nodeIndex = new Map();
	for (const def of input.nodeTypes) {
		nodeIndex.set(nodeKey(def.nodeType, def.schemaVersion), def);
	}
	const edgeById = new Map();
	const edgeByName = new Map();
	for (const def of input.edgeTypes) {
		edgeById.set(def.edgeTypeId, def);
		edgeByName.set(def.edgeType, def);
	}
	const requireNodeType = (nodeType, schemaVersion) => {
		const def = nodeIndex.get(nodeKey(nodeType, schemaVersion));
		if (!def) {
			throw new GraphSchemaRegistryError(
				"UNKNOWN_NODE_TYPE",
				`Node type not registered: ${nodeType}@${schemaVersion}`,
			);
		}
		return def;
	};
	const requireEdgeType = (edgeTypeId) => {
		const def = edgeById.get(edgeTypeId);
		if (!def) {
			throw new GraphSchemaRegistryError(
				"UNKNOWN_EDGE_TYPE",
				`Edge type id not registered: ${edgeTypeId}`,
			);
		}
		return def;
	};
	const requireEdgeTypeByName = (edgeType) => {
		const def = edgeByName.get(edgeType);
		if (!def) {
			throw new GraphSchemaRegistryError(
				"EDGE_NOT_REGISTERED",
				`Edge type not registered in allowlist: ${edgeType}`,
			);
		}
		return def;
	};
	return {
		getNodeType(nodeType, schemaVersion) {
			return nodeIndex.get(nodeKey(nodeType, schemaVersion));
		},
		requireNodeType,
		getEdgeType(edgeTypeId) {
			return edgeById.get(edgeTypeId);
		},
		requireEdgeType,
		getEdgeTypeByName(edgeType) {
			return edgeByName.get(edgeType);
		},
		requireEdgeTypeByName,
		hasEdgeType(edgeType) {
			return edgeByName.has(edgeType);
		},
		validateEdgeAllowlist(edgeAllowlist) {
			for (const edgeType of edgeAllowlist) {
				requireEdgeTypeByName(edgeType);
			}
		},
		listNodeTypes() {
			return [...nodeIndex.values()];
		},
		listEdgeTypes() {
			return [...edgeById.values()];
		},
	};
}
/** @deprecated Use createGraphSchemaRegistry — kept for S1 compatibility in tests. */
export function createInMemoryGraphSchemaRegistry(
	nodeTypes: NodeTypeDef[],
	edgeTypes: EdgeTypeDef[],
): GraphSchemaRegistry {
	return createGraphSchemaRegistry({ nodeTypes, edgeTypes });
}

export interface GraphSchemaRegistry {
	getNodeType(nodeType: string, schemaVersion: number): NodeTypeDef | undefined;
	requireNodeType(nodeType: string, schemaVersion: number): NodeTypeDef;
	getEdgeType(edgeTypeId: string): EdgeTypeDef | undefined;
	requireEdgeType(edgeTypeId: string): EdgeTypeDef;
	getEdgeTypeByName(edgeType: string): EdgeTypeDef | undefined;
	requireEdgeTypeByName(edgeType: string): EdgeTypeDef;
	hasEdgeType(edgeType: string): boolean;
	validateEdgeAllowlist(edgeAllowlist: readonly string[]): void;
	listNodeTypes(): NodeTypeDef[];
	listEdgeTypes(): EdgeTypeDef[];
}

export interface GraphSchemaRegistryInput {
	nodeTypes: readonly NodeTypeDef[];
	edgeTypes: readonly EdgeTypeDef[];
}
