/**
 * ANX-304 — Neo4j rebuild homologation: replay reproduces authorized grant facts.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	GOVERNANCE_EVENT_TYPES,
	GOVERNANCE_OWNER_DOMAIN,
} from "@anxionos/contracts/governance";
import {
	createInMemoryGraphStore,
	evaluateT01Grants,
	projectGovernanceEvent,
} from "@anxionos/graph";
import {
	createNeo4jDriverFromEnv,
	createNeo4jGraphStore,
	ensureNeo4jGraphConstraints,
} from "@anxionos/graph/neo4j";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const grantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const principalId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function shouldRunNeo4jHomologation(): boolean {
	return (
		process.env.RUN_NEO4J_INTEGRATION_TESTS === "true" &&
		Boolean(process.env.NEO4J_URI?.trim()) &&
		Boolean(process.env.NEO4J_PASSWORD?.trim())
	);
}

function grantIssuedEnvelope(eventId: string): DomainEventEnvelope {
	return {
		eventId,
		schemaVersion: "0.1.0",
		ownerDomain: GOVERNANCE_OWNER_DOMAIN,
		eventType: GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
		occurredAt: "2026-09-01T12:00:00.000Z",
		payload: {
			grantId,
			scopeId: agencyId,
			granteePrincipalId: principalId,
			capability: "graph.node.read",
			status: "active",
			authorityEpoch: 1,
			revision: 1,
			validFrom: "2026-09-01T00:00:00.000Z",
			validUntil: null,
		},
	};
}

describe("governance rebuild replay idempotence (in-memory, ANX-304)", () => {
	test("generation-2 replay reproduces authorized grant facts for T01", async () => {
		const graphStore = createInMemoryGraphStore();
		const envelope = grantIssuedEnvelope(randomUUID());
		await projectGovernanceEvent({
			envelope,
			graphStore,
			projectionGeneration: 1,
		});
		const baseline = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(baseline).not.toBeNull();

		await projectGovernanceEvent({
			envelope: { ...envelope, eventId: randomUUID() },
			graphStore,
			projectionGeneration: 2,
		});
		const afterRebuild = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(afterRebuild?.revision).toBe(baseline?.revision);
		expect(afterRebuild?.payload.capability).toBe("graph.node.read");
		// Same revision replay is idempotent — projectionGeneration unchanged (GK-R06).
		expect(afterRebuild?.projectionGeneration).toBe(1);

		const grants = await graphStore.getNodes([
			{
				scopeType: "AGENCY",
				scopeId: agencyId,
				type: "Grant",
				id: grantId,
			},
		]);
		const evaluation = evaluateT01Grants(
			{
				scope: {
					principalId,
					actingScope: { scopeType: "AGENCY", scopeId: agencyId },
				},
				params: {
					actorId: principalId,
					action: "graph.node.read",
					resourceNodeKey: {
						scopeType: "AGENCY",
						scopeId: agencyId,
						type: "Account",
						id: grantId,
					},
					validAt: "2026-09-10T12:00:00.000Z",
				},
				knownAt: "2026-09-10T12:00:00.000Z",
			},
			grants,
		);
		expect(evaluation.output.decision).toBe("ALLOW");
	});

	test("stale revision replay is a no-op during rebuild", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(randomUUID()),
			graphStore,
			projectionGeneration: 1,
		});
		await projectGovernanceEvent({
			envelope: {
				...grantIssuedEnvelope(randomUUID()),
				payload: {
					grantId,
					scopeId: agencyId,
					granteePrincipalId: principalId,
					capability: "graph.node.write",
					status: "active",
					authorityEpoch: 1,
					revision: 2,
				},
			},
			graphStore,
			projectionGeneration: 2,
		});
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(randomUUID()),
			graphStore,
			projectionGeneration: 3,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record?.revision).toBe(2);
		expect(record?.payload.capability).toBe("graph.node.write");
		expect(record?.projectionGeneration).toBe(2);
	});
});

describe("neo4j rebuild homologation (ANX-304)", () => {
	const driver = shouldRunNeo4jHomologation() ? createNeo4jDriverFromEnv() : null;

	afterAll(async () => {
		if (driver) {
			await driver.close();
		}
	});

	test("rebuild replay into Neo4j preserves grant authorization facts", async () => {
		if (!shouldRunNeo4jHomologation() || !driver) {
			return;
		}

		await ensureNeo4jGraphConstraints(driver);
		const graphStore = createNeo4jGraphStore(driver);
		const envelope = grantIssuedEnvelope(randomUUID());

		await projectGovernanceEvent({
			envelope,
			graphStore,
			projectionGeneration: 1,
		});
		const baseline = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(baseline?.payload.capability).toBe("graph.node.read");

		await projectGovernanceEvent({
			envelope: { ...envelope, eventId: randomUUID() },
			graphStore,
			projectionGeneration: 2,
		});
		const afterRebuild = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(afterRebuild?.revision).toBe(1);
		expect(afterRebuild?.payload.capability).toBe("graph.node.read");
		expect(afterRebuild?.projectionGeneration).toBe(1);
		expect(afterRebuild?.payload.validFrom).toBe("2026-09-01T00:00:00.000Z");
	});
});
