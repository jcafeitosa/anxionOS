import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createDefaultPoisonHandler,
	runOutboxRelayBatch,
	startOutboxRelayWorker,
} from "@anxionos/eventing/outbox-relay-worker";
import type { OutboxPublisher } from "@anxionos/eventing/relay";
import { DEFAULT_RETRY_POLICY } from "@anxionos/eventing/retry";
import type { Pool } from "pg";

const sampleEnvelope: DomainEventEnvelope = {
	eventId: "11111111-1111-4111-8111-111111111111",
	schemaVersion: "0.1.0",
	ownerDomain: "identity",
	eventType: "identity.principal.suspended.v1",
	occurredAt: "2026-09-08T12:00:00.000Z",
	payload: { principalId: "22222222-2222-4222-8222-222222222222" },
};

function createMockRelayPool(envelopes: DomainEventEnvelope[]): Pool {
	return {
		query: async (sql: string) => {
			if (sql.includes("relay_claimed_by = $1") && sql.includes("RETURNING")) {
				return {
					rowCount: envelopes.length,
					rows: envelopes.map((envelope) => ({
						event_id: envelope.eventId,
						owner_domain: envelope.ownerDomain,
						event_type: envelope.eventType,
						schema_version: envelope.schemaVersion,
						occurred_at: new Date(envelope.occurredAt),
						payload: envelope.payload,
					})),
				};
			}
			if (sql.includes("status = 'published'") && sql.includes("RETURNING")) {
				return { rowCount: 1, rows: [{ event_id: "marked" }] };
			}
			return { rowCount: 1, rows: [] };
		},
	} as Pool;
}

describe("outbox relay worker", () => {
	test("startOutboxRelayWorker rejects missing onPoison callback", () => {
		const pool = createMockRelayPool([]);
		const publisher: OutboxPublisher = { async publish() {} };
		expect(() =>
			startOutboxRelayWorker({
				pool,
				publisher,
				config: {
					relayId: "test-relay",
					pollIntervalMs: 1000,
					batchSize: 10,
					leaseTtlMs: 1000,
				},
			}),
		).toThrow(/onPoison DLQ callback/);
	});

	test("stop waits for loop and is idempotent", async () => {
		const abortController = new AbortController();
		let publishCount = 0;
		const publisher: OutboxPublisher = {
			async publish() {
				publishCount += 1;
			},
		};
		const pool = {
			query: async () => ({ rowCount: 0, rows: [] }),
		} as never;

		const worker = startOutboxRelayWorker({
			pool,
			publisher,
			signal: abortController.signal,
			onPoison: async () => {},
			config: {
				relayId: "test-relay",
				pollIntervalMs: 20,
				batchSize: 10,
				leaseTtlMs: 1000,
				retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 1 },
			},
		});

		await new Promise((resolve) => setTimeout(resolve, 60));
		abortController.abort();
		await worker.stop();
		await worker.stop();
		expect(publishCount).toBe(0);
	});

	test("runOutboxRelayBatch returns empty result when nothing claimed", async () => {
		const pool = {
			query: async () => ({ rowCount: 0, rows: [] }),
		} as never;
		const publisher: OutboxPublisher = {
			async publish() {},
		};

		const result = await runOutboxRelayBatch({
			pool,
			publisher,
			config: {
				relayId: "test-relay",
				pollIntervalMs: 1000,
				batchSize: 10,
				leaseTtlMs: 1000,
			},
		});

		expect(result).toEqual({ dispatched: 0, failed: 0, poisoned: 0 });
	});

	test("runOutboxRelayBatch isolates poison in batch without blocking healthy events", async () => {
		const poisonEnvelope: DomainEventEnvelope = {
			...sampleEnvelope,
			eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
		};
		const healthyEnvelope: DomainEventEnvelope = {
			...sampleEnvelope,
			eventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
		};
		const pool = createMockRelayPool([poisonEnvelope, healthyEnvelope]);
		const published: string[] = [];
		const poisoned: string[] = [];
		const publisher: OutboxPublisher = {
			async publish(envelope) {
				if (envelope.eventId === poisonEnvelope.eventId) {
					throw new Error("poison");
				}
				published.push(envelope.eventId);
			},
		};

		const result = await runOutboxRelayBatch({
			pool,
			publisher,
			onPoison: async (envelope) => {
				poisoned.push(envelope.eventId);
			},
			config: {
				relayId: "test-relay",
				pollIntervalMs: 1000,
				batchSize: 10,
				leaseTtlMs: 1000,
				retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
			},
		});

		expect(result).toEqual({ dispatched: 1, failed: 1, poisoned: 1 });
		expect(published).toEqual([healthyEnvelope.eventId]);
		expect(poisoned).toEqual([poisonEnvelope.eventId]);
	});

	test("createDefaultPoisonHandler records DLQ reason and attempts", async () => {
		const inserts: unknown[][] = [];
		const pool = {
			query: async (_sql: string, params?: unknown[]) => {
				inserts.push(params ?? []);
				return { rowCount: 1, rows: [] };
			},
		} as Pool;
		const onPoison = createDefaultPoisonHandler(pool);

		await onPoison(sampleEnvelope, new Error("publish failed"), 3);

		expect(inserts).toHaveLength(1);
		expect(inserts[0]?.[0]).toBe(sampleEnvelope.eventId);
		expect(inserts[0]?.[6]).toBe("Error: publish failed");
		expect(inserts[0]?.[7]).toBe(3);
	});
});
