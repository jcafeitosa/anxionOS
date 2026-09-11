/**
 * ANX-277 — unit tests for Product/Agent graph projectors (in-memory GraphStore).
 * User instruction: ANX-277 projection worker — 1 event → 1 node idempotent, stale revision skip.
 */
import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	AGENT_GRAPH_EVENT_TYPES,
	AGENT_GRAPH_OWNER_DOMAIN,
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import {
	createInMemoryGraphStore,
	formatNodeKey,
	projectAgentGraphEvent,
	projectProductGraphEvent,
} from "@anxionos/graph";

const companyId = "11111111-1111-4111-8111-111111111111";
const workItemId = "22222222-2222-4222-8222-222222222222";
const agencyId = "33333333-3333-4333-8333-333333333333";
const decisionId = "44444444-4444-4444-8444-444444444444";
const agentRoleId = "55555555-5555-4555-8555-555555555555";
const agentId = "66666666-6666-4666-8666-666666666666";
const featureId = "77777777-7777-4777-8777-777777777777";

function workItemEnvelope(
	revision: number,
	eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
): DomainEventEnvelope {
	return {
		eventId,
		schemaVersion: "0.1.0",
		ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
		eventType: PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED,
		occurredAt: "2026-09-10T12:00:00.000Z",
		payload: {
			workItemId,
			companyId,
			status: "in_progress",
			revision,
			title: "ANX-277",
		},
	};
}

describe("product-graph-projector (ANX-277)", () => {
	test("projects work_item.status_changed into one WorkItem node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectProductGraphEvent({
			envelope: workItemEnvelope(1),
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "ORGANIZATION" as const,
			scopeId: companyId,
			type: "WorkItem",
			id: workItemId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record).not.toBeNull();
		expect(record?.ownerDomain).toBe("product");
		expect(record?.status).toBe("in_progress");
		expect(record?.revision).toBe(1);
		expect(graphStore.records.size).toBe(1);
	});

	test("skips stale revision without duplicating node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectProductGraphEvent({
			envelope: workItemEnvelope(2, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
			graphStore,
			projectionGeneration: 1,
		});
		await projectProductGraphEvent({
			envelope: workItemEnvelope(1, "cccccccc-cccc-4ccc-8ccc-cccccccccccc"),
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "ORGANIZATION" as const,
			scopeId: companyId,
			type: "WorkItem",
			id: workItemId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.revision).toBe(2);
		expect(graphStore.records.size).toBe(1);
	});

	test("projects TRACKED_IN edge when featureId is present", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectProductGraphEvent({
			envelope: {
				...workItemEnvelope(1),
				payload: {
					workItemId,
					companyId,
					status: "in_progress",
					revision: 1,
					title: "ANX-289",
					featureId,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		expect(graphStore.records.size).toBe(2);
		expect(graphStore.edges).toHaveLength(1);
		expect(graphStore.edges[0]?.edgeType).toBe("TRACKED_IN");
		expect(graphStore.edges[0]?.from.type).toBe("Feature");
		expect(graphStore.edges[0]?.to.type).toBe("WorkItem");
	});

	test("updates node when revision increases", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectProductGraphEvent({
			envelope: workItemEnvelope(1),
			graphStore,
			projectionGeneration: 1,
		});
		await projectProductGraphEvent({
			envelope: {
				...workItemEnvelope(2, "dddddddd-dddd-4ddd-8ddd-dddddddddddd"),
				payload: {
					workItemId,
					companyId,
					status: "done",
					revision: 2,
				},
			},
			graphStore,
			projectionGeneration: 2,
		});

		const nodeKey = {
			scopeType: "ORGANIZATION" as const,
			scopeId: companyId,
			type: "WorkItem",
			id: workItemId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.status).toBe("done");
		expect(record?.revision).toBe(2);
		expect(record?.projectionGeneration).toBe(2);
	});
});

describe("agent-graph-projector (ANX-277)", () => {
	test("projects decision.recorded into Decision node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				schemaVersion: "0.1.0",
				ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
				eventType: AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED,
				occurredAt: "2026-09-10T12:00:00.000Z",
				payload: {
					decisionId,
					scopeId: agencyId,
					status: "accepted",
					revision: 1,
					summary: "ADR0005 greenlight",
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "AGENCY" as const,
			scopeId: agencyId,
			type: "Decision",
			id: decisionId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.ownerDomain).toBe("agents");
		expect(formatNodeKey(nodeKey)).toContain(agencyId);
	});

	test("projects APPROVED edge when approverAgentId is present", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "abababab-abab-4aba-8aba-abababababab",
				schemaVersion: "0.1.0",
				ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
				eventType: AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED,
				occurredAt: "2026-09-10T12:00:00.000Z",
				payload: {
					decisionId,
					scopeId: agencyId,
					status: "accepted",
					revision: 1,
					approverAgentId: agentId,
					summary: "ADR0005 greenlight",
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		expect(graphStore.records.size).toBe(2);
		expect(graphStore.edges).toHaveLength(1);
		expect(graphStore.edges[0]?.edgeType).toBe("APPROVED");
		expect(graphStore.edges[0]?.from.type).toBe("Agent");
		expect(graphStore.edges[0]?.to.type).toBe("Decision");
	});

	test("skips stale revision for decision.recorded", async () => {
		const graphStore = createInMemoryGraphStore();
		const baseEnvelope = {
			schemaVersion: "0.1.0" as const,
			ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
			eventType: AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED,
			occurredAt: "2026-09-10T12:00:00.000Z",
			payload: {
				decisionId,
				scopeId: agencyId,
				status: "accepted",
				revision: 2,
			},
		};
		await projectAgentGraphEvent({
			envelope: {
				...baseEnvelope,
				eventId: "10101010-1010-4010-8010-101010101010",
			},
			graphStore,
			projectionGeneration: 1,
		});
		await projectAgentGraphEvent({
			envelope: {
				...baseEnvelope,
				eventId: "20202020-2020-4020-8020-202020202020",
				payload: { ...baseEnvelope.payload, revision: 1 },
			},
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "AGENCY" as const,
			scopeId: agencyId,
			type: "Decision",
			id: decisionId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.revision).toBe(2);
		expect(graphStore.records.size).toBe(1);
	});

	test("projects agent.role_assigned into AgentRole node (product ownerDomain)", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				schemaVersion: "0.1.0",
				ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
				eventType: AGENT_GRAPH_EVENT_TYPES.AGENT_ROLE_ASSIGNED,
				occurredAt: "2026-09-10T12:00:00.000Z",
				payload: {
					agentRoleId,
					companyId,
					agentId,
					personaSlug: "backend-executor",
					revision: 1,
					workItemId,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "ORGANIZATION" as const,
			scopeId: companyId,
			type: "AgentRole",
			id: agentRoleId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.ownerDomain).toBe("product");
		expect(record?.payload).toMatchObject({
			personaSlug: "backend-executor",
			workItemId,
		});
	});

	test("projects ASSIGNED_TO edge when workItemId is present", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd",
				schemaVersion: "0.1.0",
				ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
				eventType: AGENT_GRAPH_EVENT_TYPES.AGENT_ROLE_ASSIGNED,
				occurredAt: "2026-09-10T12:00:00.000Z",
				payload: {
					agentRoleId,
					companyId,
					agentId,
					personaSlug: "backend-executor",
					revision: 1,
					workItemId,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		expect(graphStore.edges).toHaveLength(1);
		expect(graphStore.edges[0]?.edgeType).toBe("ASSIGNED_TO");
		expect(graphStore.edges[0]?.from.type).toBe("AgentRole");
		expect(graphStore.edges[0]?.to.type).toBe("WorkItem");
	});
});
