/**
 * ANX-292 — live Neo4j staging homologation (graph-staging profile, port 7688).
 *
 * User instruction: continue P3 after sandbox P2 — staging homologation separada do sandbox.
 *
 * Importers/callers: `bun test backend/tests/graph`, `backend/scripts/p3-staging-homologation.mjs`
 * Affected API: projectProductGraphEvent, createNeo4jGraphStore, ensureNeo4jGraphConstraints
 * Data schemas: DomainEventEnvelope work_item.status_changed.v1; GraphNode + TRACKED_IN edge
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
	createNeo4jGraphStore,
	ensureNeo4jGraphConstraints,
} from "@anxionos/graph/neo4j";
import neo4j from "neo4j-driver";

const STAGING_URI = process.env.NEO4J_STAGING_URI ?? "bolt://localhost:7688";
const STAGING_USER = process.env.NEO4J_STAGING_USER ?? "neo4j";
const STAGING_PASSWORD =
	process.env.NEO4J_STAGING_PASSWORD ?? "anxionos-staging";

function shouldRunStagingHomologation(): boolean {
	return (
		process.env.RUN_NEO4J_STAGING_INTEGRATION_TESTS === "true" &&
		Boolean(STAGING_URI.trim()) &&
		Boolean(STAGING_PASSWORD.trim())
	);
}

function createStagingDriver() {
	return neo4j.driver(
		STAGING_URI,
		neo4j.auth.basic(STAGING_USER, STAGING_PASSWORD),
	);
}

describe("neo4j staging homologation (ANX-292)", () => {
	const driver = shouldRunStagingHomologation() ? createStagingDriver() : null;

	afterAll(async () => {
		if (driver) {
			await driver.close();
		}
	});

	test("projects WorkItem + TRACKED_IN into staging Neo4j (graph-staging)", async () => {
		if (!shouldRunStagingHomologation() || !driver) {
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
				title: "ANX-292 staging homologation",
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
