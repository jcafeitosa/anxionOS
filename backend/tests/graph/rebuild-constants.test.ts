/**
 * ANX-277 — rebuild registry includes product/agents consumer mapping.
 */
import { describe, expect, test } from "bun:test";
import {
	GRAPH_AGENTS_CONSUMER_NAME,
	GRAPH_PRODUCT_CONSUMER_NAME,
	GRAPH_REBUILD_CONSUMER_BY_DOMAIN,
	GRAPH_REBUILD_OWNER_DOMAIN_ORDER,
} from "@anxionos/graph";

describe("graph rebuild constants (ANX-277)", () => {
	test("product and agents domains are in rebuild order before risk", () => {
		const productIndex = GRAPH_REBUILD_OWNER_DOMAIN_ORDER.indexOf("product");
		const agentsIndex = GRAPH_REBUILD_OWNER_DOMAIN_ORDER.indexOf("agents");
		const riskIndex = GRAPH_REBUILD_OWNER_DOMAIN_ORDER.indexOf("risk");
		expect(productIndex).toBeGreaterThan(-1);
		expect(agentsIndex).toBeGreaterThan(productIndex);
		expect(riskIndex).toBeGreaterThan(agentsIndex);
	});

	test("consumer durable names map to projection consumers", () => {
		expect(GRAPH_REBUILD_CONSUMER_BY_DOMAIN.product).toBe(
			GRAPH_PRODUCT_CONSUMER_NAME,
		);
		expect(GRAPH_REBUILD_CONSUMER_BY_DOMAIN.agents).toBe(
			GRAPH_AGENTS_CONSUMER_NAME,
		);
	});
});
