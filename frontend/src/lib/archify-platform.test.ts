import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ARCHIFY_PLATFORM_EDGES,
	ARCHIFY_PLATFORM_NODES,
	focusedNodeIds,
	relationsFor,
} from "./archify-platform.ts";

describe("archify platform catalog", () => {
	it("keeps the authored 11 nodes and does not explode 23 modules", () => {
		assert.equal(ARCHIFY_PLATFORM_NODES.length, 11);
		assert.equal(
			ARCHIFY_PLATFORM_NODES.filter((node) => node.id === "modules").length,
			1,
		);
		assert.equal(
			ARCHIFY_PLATFORM_NODES.find((node) => node.id === "modules")?.sublabel,
			"23 contexts",
		);
		assert.ok(!ARCHIFY_PLATFORM_NODES.some((node) => node.id === "portfolios"));
		assert.ok(!ARCHIFY_PLATFORM_NODES.some((node) => node.id === "capital"));
	});

	it("focuses request-path on Astro → PG + Neo4j without inventing grants", () => {
		const ids = focusedNodeIds("request-path");
		assert.deepEqual(
			[...ids],
			["actors", "frontend", "api", "modules", "postgres", "graph"],
		);
		assert.ok(!ids.has("providers"));
	});

	it("lists authored relations for the Consoles node", () => {
		const { outgoing, incoming } = relationsFor("frontend");
		assert.equal(outgoing[0]?.to, "api");
		assert.equal(incoming[0]?.from, "actors");
		assert.equal(ARCHIFY_PLATFORM_EDGES.length, 10);
	});
});
