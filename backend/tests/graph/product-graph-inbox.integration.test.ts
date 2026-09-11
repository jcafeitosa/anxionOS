/**
 * ANX-277 — inbox idempotency for product graph projection (PG + in-memory store).
 * Skipped unless RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL set.
 */
import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	AGENT_GRAPH_EVENT_TYPES,
	AGENT_GRAPH_OWNER_DOMAIN,
	PRODUCT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_OWNER_DOMAIN,
} from "@anxionos/contracts/graph";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	agentProjectionConsumer,
	createInMemoryGraphStore,
	ensureGraphSchema,
	processWithInbox,
	productProjectionConsumer,
	projectAgentGraphEvent,
	projectProductGraphEvent,
} from "@anxionos/graph";

function shouldRun(): boolean {
	return (
		process.env.RUN_PG_INTEGRATION_TESTS === "true" &&
		Boolean(process.env.DATABASE_URL?.trim())
	);
}

const envelope: DomainEventEnvelope = {
	eventId: "12121212-1212-4212-8212-121212121212",
	schemaVersion: "0.1.0",
	ownerDomain: PRODUCT_GRAPH_OWNER_DOMAIN,
	eventType: PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED,
	occurredAt: "2026-09-10T15:00:00.000Z",
	payload: {
		workItemId: "22222222-2222-4222-8222-222222222222",
		companyId: "11111111-1111-4111-8111-111111111111",
		status: "in_progress",
		revision: 1,
	},
};

describe("product graph inbox integration (ANX-277)", () => {
	test("processWithInbox is idempotent per eventId for graph:product:v1", async () => {
		if (!shouldRun()) {
			return;
		}

		const pool = createPgPool(process.env.DATABASE_URL!);
		try {
			await ensureGraphSchema(pool);
			const graphStore = createInMemoryGraphStore();

			const first = await processWithInbox({
				pool,
				graphStore,
				consumerName: productProjectionConsumer.consumerName,
				ownerDomain: productProjectionConsumer.ownerDomain,
				envelope,
				project: projectProductGraphEvent,
			});
			const second = await processWithInbox({
				pool,
				graphStore,
				consumerName: productProjectionConsumer.consumerName,
				ownerDomain: productProjectionConsumer.ownerDomain,
				envelope,
				project: projectProductGraphEvent,
			});

			expect(first.status).toBe("processed");
			expect(second.status).toBe("duplicate");
			expect(graphStore.records.size).toBe(1);
		} finally {
			await pool.end();
		}
	});

	test("processWithInbox is idempotent per eventId for graph:agents:v1", async () => {
		if (!shouldRun()) {
			return;
		}

		const agentsEnvelope: DomainEventEnvelope = {
			eventId: "13131313-1313-4313-8313-131313131313",
			schemaVersion: "0.1.0",
			ownerDomain: AGENT_GRAPH_OWNER_DOMAIN,
			eventType: AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED,
			occurredAt: "2026-09-10T15:00:00.000Z",
			payload: {
				decisionId: "44444444-4444-4444-8444-444444444444",
				scopeId: "33333333-3333-4333-8333-333333333333",
				status: "accepted",
				revision: 1,
			},
		};

		const pool = createPgPool(process.env.DATABASE_URL!);
		try {
			await ensureGraphSchema(pool);
			const graphStore = createInMemoryGraphStore();

			const first = await processWithInbox({
				pool,
				graphStore,
				consumerName: agentProjectionConsumer.consumerName,
				ownerDomain: agentProjectionConsumer.ownerDomain,
				envelope: agentsEnvelope,
				project: projectAgentGraphEvent,
			});
			const second = await processWithInbox({
				pool,
				graphStore,
				consumerName: agentProjectionConsumer.consumerName,
				ownerDomain: agentProjectionConsumer.ownerDomain,
				envelope: agentsEnvelope,
				project: projectAgentGraphEvent,
			});

			expect(first.status).toBe("processed");
			expect(second.status).toBe("duplicate");
			expect(graphStore.records.size).toBe(1);
		} finally {
			await pool.end();
		}
	});
});
