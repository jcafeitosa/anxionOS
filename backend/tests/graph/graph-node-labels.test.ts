/**
 * ANX-277 — Neo4j label resolution for Product/Agent graph separation.
 */
import { describe, expect, test } from "bun:test";
import {
	formatNeo4jLabelClause,
	resolveNeo4jGraphLabels,
} from "../../modules/graph/src/infrastructure/adapters/neo4j/graph-node-labels";

describe("graph-node-labels (ANX-277)", () => {
	test("product ownerDomain gets ProductGraph_Node secondary label", () => {
		expect(resolveNeo4jGraphLabels("product")).toEqual([
			"GraphNode",
			"ProductGraph_Node",
		]);
		expect(formatNeo4jLabelClause(resolveNeo4jGraphLabels("product"))).toBe(
			":GraphNode:ProductGraph_Node",
		);
	});

	test("agents ownerDomain gets AgentGraph_Node secondary label", () => {
		expect(resolveNeo4jGraphLabels("agents")).toContain("AgentGraph_Node");
	});

	test("institutional domains keep GraphNode only", () => {
		expect(resolveNeo4jGraphLabels("governance")).toEqual(["GraphNode"]);
	});
});
