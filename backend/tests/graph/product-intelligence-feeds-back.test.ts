/**
 * ANX-278 — FEEDS_BACK edge projection (Monitor → Problem).
 */
import { describe, expect, test } from "bun:test";
import {
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import { createInMemoryGraphStore, projectProductGraphEvent } from "@anxionos/graph";

const companyId = "11111111-1111-4111-8111-111111111111";
const monitorId = "77777777-7777-4777-8777-777777777777";
const problemId = "88888888-8888-4888-8888-888888888888";

describe("product intelligence FEEDS_BACK (ANX-278)", () => {
	test("projects intelligence.feeds_back into Monitor, Problem and FEEDS_BACK edge", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectProductGraphEvent({
			envelope: {
				eventId: "99999999-9999-4999-8999-999999999999",
				schemaVersion: "0.1.0",
				ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
				eventType: PRODUCT_GRAPH_EVENT_TYPES.INTELLIGENCE_FEEDS_BACK,
				occurredAt: "2026-09-10T16:00:00.000Z",
				payload: {
					companyId,
					monitorId,
					problemId,
					revision: 1,
					metricName: "p99_latency_ms",
					metricValue: 840,
					threshold: 500,
					unit: "ms",
					insightSummary: "p99 invite API degradou pós-release",
					problemStatement: "Latência p99 acima do SLO",
					triggerDiscovery: true,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		expect(graphStore.records.size).toBe(2);
		expect(graphStore.edges.length).toBe(1);
		expect(graphStore.edges[0]?.edgeType).toBe("FEEDS_BACK");

		const neighbors = await graphStore.listNeighbors({
			startNodeKey: {
				scopeType: "ORGANIZATION",
				scopeId: companyId,
				type: "Monitor",
				id: monitorId,
			},
			direction: "OUT",
			edgeTypes: ["FEEDS_BACK"],
			maxResults: 10,
		});
		expect(neighbors).toHaveLength(1);
		expect(neighbors[0]?.targetNodeKey.type).toBe("Problem");
	});
});
