/**
 * ANX-139 / G3-AGT-05 — unit tests for core agents graph projection (graph:agents:v1).
 */
import { describe, expect, test } from "bun:test";
import {
	AGENTS_EVENT_TYPES,
	AGENTS_OWNER_DOMAIN,
} from "@anxionos/contracts/agents";
import { AGENT_GRAPH_OWNER_DOMAIN } from "@anxionos/contracts/graph";
import {
	createInMemoryGraphStore,
	projectAgentGraphEvent,
} from "@anxionos/graph";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const agentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const agentVersionId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("agents-core-graph-projector (ANX-139 / G3-AGT-05)", () => {
	test("projects agents.agent.registered into Agent node", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "11111111-1111-4111-8111-111111111111",
				schemaVersion: "0.1.0",
				ownerDomain: AGENTS_OWNER_DOMAIN,
				eventType: AGENTS_EVENT_TYPES.AGENT_REGISTERED,
				occurredAt: "2026-09-10T16:00:00.000Z",
				payload: {
					agentId,
					organizationId,
					agencyId,
					kind: "AGENCY",
					displayName: "Research Agent",
					status: "DRAFT",
					revision: 1,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "AGENCY" as const,
			scopeId: organizationId,
			type: "Agent",
			id: agentId,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record?.ownerDomain).toBe(AGENT_GRAPH_OWNER_DOMAIN);
		expect(record?.payload).toMatchObject({
			displayName: "Research Agent",
			kind: "AGENCY",
			lifecycleStatus: "DRAFT",
		});
	});

	test("updates Agent on agents.agent_version.published", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectAgentGraphEvent({
			envelope: {
				eventId: "22222222-2222-4222-8222-222222222222",
				schemaVersion: "0.1.0",
				ownerDomain: AGENTS_OWNER_DOMAIN,
				eventType: AGENTS_EVENT_TYPES.AGENT_REGISTERED,
				occurredAt: "2026-09-10T16:00:00.000Z",
				payload: {
					agentId,
					organizationId,
					agencyId,
					kind: "AGENCY",
					displayName: "Research Agent",
					status: "DRAFT",
					revision: 1,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});
		await projectAgentGraphEvent({
			envelope: {
				eventId: "33333333-3333-4333-8333-333333333333",
				schemaVersion: "0.1.0",
				ownerDomain: AGENTS_OWNER_DOMAIN,
				eventType: AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED,
				occurredAt: "2026-09-10T16:01:00.000Z",
				payload: {
					agentVersionId,
					agentId,
					organizationId,
					versionNumber: 1,
					capabilityManifestHash: "sha256:manifest1",
					autonomyLevel: "L1",
					instructionRef: {
						bucket: "agents-instructions",
						key: "org/test/instruction-v1.json",
						contentHash: "sha256:abc",
					},
					skillRefs: [],
					revision: 2,
				},
			},
			graphStore,
			projectionGeneration: 1,
		});

		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "Agent",
			id: agentId,
		});
		expect(record?.revision).toBe(2);
		expect(record?.payload).toMatchObject({
			activeVersionId: agentVersionId,
			capabilityManifestHash: "sha256:manifest1",
			autonomyLevel: "L1",
			versionNumber: 1,
		});
	});

	test("skips stale revision for agents.agent.status_changed", async () => {
		const graphStore = createInMemoryGraphStore();
		const base = {
			schemaVersion: "0.1.0" as const,
			ownerDomain: AGENTS_OWNER_DOMAIN,
			eventType: AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED,
			payload: {
				agentId,
				organizationId,
				fromStatus: "DRAFT" as const,
				toStatus: "CONFIGURED" as const,
				revision: 2,
			},
		};
		await projectAgentGraphEvent({
			envelope: {
				...base,
				eventId: "44444444-4444-4444-8444-444444444444",
				occurredAt: "2026-09-10T16:02:00.000Z",
			},
			graphStore,
			projectionGeneration: 1,
		});
		await projectAgentGraphEvent({
			envelope: {
				...base,
				eventId: "55555555-5555-4555-8555-555555555555",
				occurredAt: "2026-09-10T16:03:00.000Z",
				payload: { ...base.payload, revision: 1, toStatus: "READY" },
			},
			graphStore,
			projectionGeneration: 1,
		});

		const record = await graphStore.getNode({
			scopeType: "AGENCY",
			scopeId: organizationId,
			type: "Agent",
			id: agentId,
		});
		expect(record?.payload.lifecycleStatus).toBe("CONFIGURED");
		expect(record?.revision).toBe(2);
	});
});
