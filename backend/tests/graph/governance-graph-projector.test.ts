/**
 * ANX-302 — governance grant projection with bitemporal payload (RB-D04).
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	GOVERNANCE_EVENT_TYPES,
	GOVERNANCE_OWNER_DOMAIN,
} from "@anxionos/contracts/governance";
import {
	GRAPH_T01_DENY_REASONS,
	createInMemoryGraphStore,
	evaluateT01Grants,
	projectGovernanceEvent,
} from "@anxionos/graph";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const grantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const principalId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function grantIssuedEnvelope(
	overrides: Record<string, unknown> = {},
): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
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
			...overrides,
		},
	};
}

describe("governance-graph-projector (ANX-302)", () => {
	test("projects grant.issued with bitemporal payload from event", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record?.payload.validFrom).toBe("2026-09-01T00:00:00.000Z");
		expect(record?.payload.recordedFrom).toBe("2026-09-01T12:00:00.000Z");
		expect(record?.payload.validUntil).toBeNull();
	});

	test("skips stale revision without overwriting newer grant node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope({ revision: 2, capability: "graph.node.write" }),
			graphStore,
			projectionGeneration: 1,
		});
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope({
				revision: 1,
				capability: "graph.node.read",
			}),
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record?.revision).toBe(2);
		expect(record?.payload.capability).toBe("graph.node.write");
		expect(graphStore.records.size).toBe(1);
	});

	test("grant.revoked closes valid and recorded intervals", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		await projectGovernanceEvent({
			envelope: {
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: GOVERNANCE_OWNER_DOMAIN,
				eventType: GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
				occurredAt: "2026-09-10T12:00:00.000Z",
				payload: {
					grantId,
					scopeId: agencyId,
					authorityEpoch: 2,
					revision: 2,
					revokedAt: "2026-09-10T12:00:00.000Z",
				},
			},
			graphStore,
			projectionGeneration: 2,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record?.status).toBe("revoked");
		expect(record?.payload.validUntil).toBe("2026-09-10T12:00:00.000Z");
		expect(record?.payload.recordedUntil).toBe("2026-09-10T12:00:00.000Z");
	});

	test("T01 allows when projected grant is active at validAt", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record).not.toBeNull();
		const result = evaluateT01Grants(
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
					validAt: "2026-09-05T00:00:00.000Z",
				},
			},
			[record!],
		);
		expect(result.output.decision).toBe("ALLOW");
	});

	test("T01 denies when validAt precedes projected validFrom", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectGovernanceEvent({
			envelope: grantIssuedEnvelope(),
			graphStore,
			projectionGeneration: 1,
		});
		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: agencyId,
			type: "Grant",
			id: grantId,
		});
		expect(record).not.toBeNull();
		const result = evaluateT01Grants(
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
					validAt: "2026-08-01T00:00:00.000Z",
				},
			},
			[record!],
		);
		expect(result.output.decision).toBe("DENY");
		expect(result.output.denyReasons).toContain(
			GRAPH_T01_DENY_REASONS.TEMPORAL_INACTIVE,
		);
	});
});
