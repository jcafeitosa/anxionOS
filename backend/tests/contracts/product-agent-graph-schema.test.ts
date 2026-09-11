import { describe, expect, test } from "bun:test";
import {
	AGENT_GRAPH_EDGE_TYPES,
	AGENT_GRAPH_NODE_TYPES,
	PRODUCT_GRAPH_EDGE_TYPES,
	PRODUCT_GRAPH_NODE_TYPES,
} from "@anxionos/contracts/graph";
import {
	createAgentGraphSchemaRegistry,
	createProductAgentGraphSchemaRegistry,
	createProductGraphSchemaRegistry,
} from "@anxionos/graph";

describe("Product Graph schema registry (ANX-271)", () => {
	test("PRODUCT_GRAPH_NODE_TYPES has 15 node types", () => {
		expect(PRODUCT_GRAPH_NODE_TYPES.length).toBe(15);
		expect(
			PRODUCT_GRAPH_NODE_TYPES.every((n) => n.ownerDomain === "product"),
		).toBe(true);
	});

	test("PRODUCT_GRAPH_EDGE_TYPES includes FEEDS_BACK and IMPLEMENTS", () => {
		const names = PRODUCT_GRAPH_EDGE_TYPES.map((e) => e.edgeType);
		expect(names).toContain("FEEDS_BACK");
		expect(names).toContain("IMPLEMENTS");
		expect(names).toContain("TRACKED_IN");
		expect(names).toContain("ASSIGNED_TO");
	});

	test("createProductGraphSchemaRegistry resolves WorkItem and edges", () => {
		const registry = createProductGraphSchemaRegistry();
		expect(registry.requireNodeType("WorkItem", 1).ownerDomain).toBe("product");
		registry.validateEdgeAllowlist(["TRACKED_IN", "FEEDS_BACK"]);
		expect(registry.listEdgeTypes().length).toBe(
			PRODUCT_GRAPH_EDGE_TYPES.length,
		);
	});
});

describe("Agent Graph schema registry (ANX-271)", () => {
	test("AGENT_GRAPH_NODE_TYPES has 9 node types", () => {
		expect(AGENT_GRAPH_NODE_TYPES.length).toBe(9);
		expect(
			AGENT_GRAPH_NODE_TYPES.every((n) => n.ownerDomain === "agents"),
		).toBe(true);
	});

	test("createAgentGraphSchemaRegistry resolves PAIRED_WITH", () => {
		const registry = createAgentGraphSchemaRegistry();
		const edge = registry.requireEdgeTypeByName("PAIRED_WITH");
		expect(edge.fromNodeTypes).toContain("Agent");
		expect(edge.cardinality).toBe("one-to-one");
	});

	test("BRIDGES_PRODUCT_ROLE links agent taxonomy to product AgentRole", () => {
		const registry = createAgentGraphSchemaRegistry();
		const edge = registry.requireEdgeTypeByName("BRIDGES_PRODUCT_ROLE");
		expect(edge.toNodeTypes).toContain("AgentRole");
	});
});

describe("Combined Product+Agent schema registry", () => {
	test("createProductAgentGraphSchemaRegistry merges without duplicate node keys", () => {
		const registry = createProductAgentGraphSchemaRegistry();
		expect(registry.listNodeTypes().length).toBe(
			PRODUCT_GRAPH_NODE_TYPES.length + AGENT_GRAPH_NODE_TYPES.length,
		);
		expect(registry.listEdgeTypes().length).toBe(
			PRODUCT_GRAPH_EDGE_TYPES.length + AGENT_GRAPH_EDGE_TYPES.length,
		);
		registry.validateEdgeAllowlist([
			"IMPLEMENTS",
			"PAIRED_WITH",
			"BRIDGES_PRODUCT_ROLE",
		]);
	});
});
