import type { Driver, Record as Neo4jRecord } from "neo4j-driver";
import neo4j, {} from "neo4j-driver";
import { formatNodeKey, parseNodeKey } from "../../../domain/node-key";
import type {
	GraphEdgeRecord,
	GraphNeighborEdge,
	GraphNodeRecord,
	GraphStore,
} from "../../../domain/ports/graph-store";
import {
	formatNeo4jLabelClause,
	resolveNeo4jGraphLabels,
} from "./graph-node-labels";

function toNumber(value: unknown) {
	if (neo4j.isInt(value)) {
		return value.toNumber();
	}
	if (typeof value === "number") {
		return value;
	}
	throw new Error(`Expected numeric Neo4j property, got ${typeof value}`);
}
function parsePayload(value: unknown) {
	if (value === null || value === undefined) {
		return {};
	}
	if (typeof value === "string") {
		return JSON.parse(value);
	}
	if (typeof value === "object") {
		return value;
	}
	throw new Error(`Expected JSON payload property, got ${typeof value}`);
}
function nodePropertiesToRecord(properties: Record<string, unknown>) {
	return {
		nodeKey: parseNodeKey(String(properties.nodeKey)),
		schemaVersion: toNumber(properties.schemaVersion),
		ownerDomain: String(properties.ownerDomain),
		status: String(properties.status),
		revision: toNumber(properties.revision),
		projectionGeneration: toNumber(properties.projectionGeneration),
		payload: parsePayload(properties.payloadJson ?? properties.payload),
	};
}
function recordToGraphNode(record: Neo4jRecord) {
	const node = record.get("n");
	if (!node || typeof node !== "object" || !("properties" in node)) {
		throw new Error("Neo4j record missing node projection");
	}
	return nodePropertiesToRecord(node.properties);
}
function toWriteProperties(record: GraphNodeRecord, eventId: string) {
	const nodeKey = formatNodeKey(record.nodeKey);
	return {
		nodeKey,
		scopeType: record.nodeKey.scopeType,
		scopeId: record.nodeKey.scopeId,
		nodeType: record.nodeKey.type,
		nodeId: record.nodeKey.id,
		schemaVersion: neo4j.int(record.schemaVersion),
		ownerDomain: record.ownerDomain,
		status: record.status,
		revision: neo4j.int(record.revision),
		projectionGeneration: neo4j.int(record.projectionGeneration),
		payloadJson: JSON.stringify(record.payload),
		lastEventId: eventId,
	};
}
export function createNeo4jGraphStore(driver: Driver): GraphStore {
	return {
		async getNode(nodeKey) {
			const session = driver.session();
			try {
				const result = await session.run(
					`MATCH (n:GraphNode { nodeKey: $nodeKey })
					 RETURN n`,
					{ nodeKey: formatNodeKey(nodeKey) },
				);
				const row = result.records[0];
				return row ? recordToGraphNode(row) : null;
			} finally {
				await session.close();
			}
		},
		async getNodes(nodeKeys) {
			if (nodeKeys.length === 0) {
				return [];
			}
			const session = driver.session();
			try {
				const result = await session.run(
					`UNWIND $nodeKeys AS key
					 MATCH (n:GraphNode { nodeKey: key })
					 RETURN n`,
					{ nodeKeys: nodeKeys.map(formatNodeKey) },
				);
				return result.records.map(recordToGraphNode);
			} finally {
				await session.close();
			}
		},
		async upsertNode(record, eventId) {
			const session = driver.session();
			const properties = toWriteProperties(record, eventId);
			const labelClause = formatNeo4jLabelClause(
				resolveNeo4jGraphLabels(record.ownerDomain),
			);
			try {
				await session.run(
					`MERGE (n${labelClause} { nodeKey: $nodeKey })
					 ON CREATE SET
					   n = $properties,
					   n.createdAt = datetime()
					 ON MATCH SET
					   n += $properties,
					   n.updatedAt = datetime()`,
					{
						nodeKey: properties.nodeKey,
						properties,
					},
				);
			} finally {
				await session.close();
			}
		},

		async upsertEdge(record: GraphEdgeRecord, eventId: string) {
			const session = driver.session();
			const fromKey = formatNodeKey(record.fromNodeKey);
			const toKey = formatNodeKey(record.toNodeKey);
			try {
				await session.run(
					`MATCH (from:GraphNode { nodeKey: $fromKey })
					 MATCH (to:GraphNode { nodeKey: $toKey })
					 MERGE (from)-[r:` +
						"`" +
						record.edgeType +
						"`" +
						`]->(to)
					 ON CREATE SET
					   r.edgeType = $edgeType,
					   r.ownerDomain = $ownerDomain,
					   r.revision = $revision,
					   r.projectionGeneration = $projectionGeneration,
					   r.payloadJson = $payloadJson,
					   r.lastEventId = $eventId,
					   r.createdAt = datetime()
					 ON MATCH SET
					   r.ownerDomain = $ownerDomain,
					   r.revision = $revision,
					   r.projectionGeneration = $projectionGeneration,
					   r.payloadJson = $payloadJson,
					   r.lastEventId = $eventId,
					   r.updatedAt = datetime()`,
					{
						fromKey,
						toKey,
						edgeType: record.edgeType,
						ownerDomain: record.ownerDomain,
						revision: neo4j.int(record.revision),
						projectionGeneration: neo4j.int(record.projectionGeneration),
						payloadJson: JSON.stringify(record.payload),
						eventId,
					},
				);
			} finally {
				await session.close();
			}
		},
		async deleteNode(nodeKey, eventId) {
			const session = driver.session();
			try {
				await session.run(
					`MATCH (n:GraphNode { nodeKey: $nodeKey })
					 SET n.lastEventId = $eventId,
					     n.deletedAt = datetime()
					 DETACH DELETE n`,
					{
						nodeKey: formatNodeKey(nodeKey),
						eventId,
					},
				);
			} finally {
				await session.close();
			}
		},
		async listNeighbors(query) {
			const session = driver.session();
			const startKey = formatNodeKey(query.startNodeKey);
			const neighbors: GraphNeighborEdge[] = [];
			try {
				if (query.direction !== "IN") {
					const outResult = await session.run(
						`MATCH (n:GraphNode { nodeKey: $startKey })-[r]->(m:GraphNode)
						 WHERE $edgeTypes IS NULL OR type(r) IN $edgeTypes
						 RETURN type(r) AS edgeType, m.nodeKey AS targetNodeKey
						 LIMIT $limit`,
						{
							startKey,
							edgeTypes: query.edgeTypes ?? null,
							limit: neo4j.int(query.maxResults),
						},
					);
					for (const row of outResult.records) {
						neighbors.push({
							edgeType: String(row.get("edgeType")),
							direction: "OUT",
							targetNodeKey: parseNodeKey(String(row.get("targetNodeKey"))),
						});
					}
				}
				if (query.direction !== "OUT" && neighbors.length < query.maxResults) {
					const inResult = await session.run(
						`MATCH (n:GraphNode { nodeKey: $startKey })<-[r]-(m:GraphNode)
						 WHERE $edgeTypes IS NULL OR type(r) IN $edgeTypes
						 RETURN type(r) AS edgeType, m.nodeKey AS targetNodeKey
						 LIMIT $limit`,
						{
							startKey,
							edgeTypes: query.edgeTypes ?? null,
							limit: neo4j.int(query.maxResults - neighbors.length),
						},
					);
					for (const row of inResult.records) {
						neighbors.push({
							edgeType: String(row.get("edgeType")),
							direction: "IN",
							targetNodeKey: parseNodeKey(String(row.get("targetNodeKey"))),
						});
					}
				}
				return neighbors.slice(0, query.maxResults);
			} finally {
				await session.close();
			}
		},
	};
}
