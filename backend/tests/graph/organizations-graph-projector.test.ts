/**
 * ANX-257 — unit tests for organizations graph projector (agency scope + ownerDomain).
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	ORGANIZATION_EVENT_TYPES,
	ORGANIZATIONS_OWNER_DOMAIN,
} from "@anxionos/contracts/organizations";
import {
	createInMemoryGraphStore,
	formatNodeKey,
	projectOrganizationsEvent,
} from "@anxionos/graph";

const agencyIdA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agencyIdB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const principalId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const membershipId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function agencyCreatedEnvelope(
	agencyId: string,
	eventId = randomUUID(),
): DomainEventEnvelope {
	return {
		eventId,
		schemaVersion: "0.1.0",
		ownerDomain: ORGANIZATIONS_OWNER_DOMAIN,
		eventType: ORGANIZATION_EVENT_TYPES.AGENCY_CREATED,
		occurredAt: "2026-09-10T12:00:00.000Z",
		agencyId,
		payload: {
			agencyId,
			ownerPrincipalId: principalId,
			displayName: "Agency",
			marketScope: "stocks",
			status: "ready",
			onboardingStep: "ready",
			revision: 1,
		},
	};
}

describe("organizations-graph-projector (ANX-257)", () => {
	test("projects agency.created under AGENCY scope with ownerDomain organizations", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectOrganizationsEvent({
			envelope: agencyCreatedEnvelope(agencyIdA),
			graphStore,
			projectionGeneration: 1,
		});

		const nodeKey = {
			scopeType: "AGENCY" as const,
			scopeId: agencyIdA,
			type: "Agency",
			id: agencyIdA,
		};
		const record = await graphStore.getNode(nodeKey);
		expect(record).not.toBeNull();
		expect(record?.ownerDomain).toBe(ORGANIZATIONS_OWNER_DOMAIN);
		expect(record?.nodeKey.scopeId).toBe(agencyIdA);
		expect(graphStore.records.size).toBe(1);
	});

	test("isolates agencies by scopeId on separate nodes", async () => {
		const graphStore = createInMemoryGraphStore();
		await projectOrganizationsEvent({
			envelope: agencyCreatedEnvelope(agencyIdA, randomUUID()),
			graphStore,
			projectionGeneration: 1,
		});
		await projectOrganizationsEvent({
			envelope: agencyCreatedEnvelope(agencyIdB, randomUUID()),
			graphStore,
			projectionGeneration: 1,
		});

		expect(graphStore.records.size).toBe(2);
		const keys = [...graphStore.records.keys()];
		expect(keys).toContain(formatNodeKey(agencyNodeKey(agencyIdA)));
		expect(keys).toContain(formatNodeKey(agencyNodeKey(agencyIdB)));
	});

	test("rejects wrong ownerDomain", async () => {
		const graphStore = createInMemoryGraphStore();
		const envelope = agencyCreatedEnvelope(agencyIdA);
		envelope.ownerDomain = "governance";
		await expect(
			projectOrganizationsEvent({
				envelope,
				graphStore,
				projectionGeneration: 1,
			}),
		).rejects.toThrow(/ownerDomain/);
	});

	test("rejects missing envelope.agencyId", async () => {
		const graphStore = createInMemoryGraphStore();
		const envelope = agencyCreatedEnvelope(agencyIdA);
		delete envelope.agencyId;
		await expect(
			projectOrganizationsEvent({
				envelope,
				graphStore,
				projectionGeneration: 1,
			}),
		).rejects.toThrow(/agencyId/);
	});

	test("rejects agencyId mismatch between envelope and payload", async () => {
		const graphStore = createInMemoryGraphStore();
		const envelope = agencyCreatedEnvelope(agencyIdA);
		envelope.agencyId = agencyIdB;
		await expect(
			projectOrganizationsEvent({
				envelope,
				graphStore,
				projectionGeneration: 1,
			}),
		).rejects.toThrow(/mismatch/);
	});
});

function agencyNodeKey(agencyId: string) {
	return {
		scopeType: "AGENCY" as const,
		scopeId: agencyId,
		type: "Agency",
		id: agencyId,
	};
}
