/**
 * ANX-290 — live Neo4j sandbox homologation for Product Graph projection.
 *
 * User instruction (verbatim goal): "concluir apenas quando cada entregável estiver comprovado
 * por arquivos, issue/taskboard, testes, revisões, diagramas e evidências de runtime aplicáveis"
 * + homologação staging live (Neo4j graph-sandbox profile).
 *
 * Importers/callers: `bun test backend/tests/graph`, `backend/scripts/p2-sandbox-homologation.mjs`
 * Affected API: projectProductGraphEvent, createNeo4jGraphStore, ensureNeo4jGraphConstraints
 * Data schemas: DomainEventEnvelope work_item.status_changed.v1; GraphNode + TRACKED_IN edge in Neo4j
 */

import { afterAll, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import { formatNodeKey, projectProductGraphEvent } from "@anxionos/graph";
import {
	createNeo4jDriverFromEnv,
	createNeo4jGraphStore,
	ensureNeo4jGraphConstraints,
} from "@anxionos/graph/neo4j";

function shouldRunNeo4jHomologation(): boolean {
	return (
		process.env.RUN_NEO4J_INTEGRATION_TESTS === "true" &&
		Boolean(process.env.NEO4J_URI?.trim()) &&
		Boolean(process.env.NEO4J_PASSWORD?.trim())
	);
}

describe("neo4j sandbox homologation (ANX-290)", () => {
	const driver = shouldRunNeo4jHomologation()
		? createNeo4jDriverFromEnv()
		: null;

	afterAll(async () => {
		if (driver) {
			await driver.close();
		}
	});

	test("projects WorkItem + TRACKED_IN into live Neo4j (graph-sandbox)", async () => {
		if (!shouldRunNeo4jHomologation() || !driver) {
			return;
		}

		await ensureNeo4jGraphConstraints(driver);
		const graphStore = createNeo4jGraphStore(driver);

		const companyId = randomUUID();
		const workItemId = randomUUID();
		const featureId = randomUUID();
		const eventId = randomUUID();

		const envelope: DomainEventEnvelope = {
			eventId,
			schemaVersion: "0.1.0",
			ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
			eventType: PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED,
			occurredAt: new Date().toISOString(),
			payload: {
				workItemId,
				companyId,
				status: "in_progress",
				revision: 1,
				title: "ANX-290 homologation",
				featureId,
			},
		};

		await projectProductGraphEvent({
			envelope,
			graphStore,
			projectionGeneration: 1,
		});

		const workItemKey = {
			scopeType: "ORGANIZATION" as const,
			scopeId: companyId,
			type: "WorkItem",
			id: workItemId,
		};
		const stored = await graphStore.getNode(workItemKey);
		expect(stored).not.toBeNull();
		expect(stored?.status).toBe("in_progress");

		const neighbors = await graphStore.listNeighbors({
			startNodeKey: {
				scopeType: "ORGANIZATION",
				scopeId: companyId,
				type: "Feature",
				id: featureId,
			},
			edgeTypes: ["TRACKED_IN"],
			direction: "OUT",
			maxResults: 5,
		});
		expect(neighbors.some((edge) => edge.edgeType === "TRACKED_IN")).toBe(true);
		expect(
			neighbors.some(
				(edge) =>
					formatNodeKey(edge.targetNodeKey) === formatNodeKey(workItemKey),
			),
		).toBe(true);

		await projectProductGraphEvent({
			envelope: { ...envelope, eventId: randomUUID() },
			graphStore,
			projectionGeneration: 2,
		});
		const afterReplay = await graphStore.getNode(workItemKey);
		expect(afterReplay?.revision).toBe(1);
	});
});
