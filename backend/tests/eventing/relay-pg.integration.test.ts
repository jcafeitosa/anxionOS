import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	appendEventAtomic,
	fetchPendingOutbox,
	processWithInbox,
} from "@anxionos/eventing/postgres";
import {
	moveToDeadLetter,
	type OutboxPublisher,
	relayPendingOutbox,
} from "@anxionos/eventing/relay";
import { DEFAULT_RETRY_POLICY } from "@anxionos/eventing/retry";
import {
	shouldRunPgIntegrationTests,
	withEventingPgHarness,
} from "./test-support";

const sampleEnvelope: DomainEventEnvelope = {
	eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	schemaVersion: "0.1.0",
	ownerDomain: "identity",
	eventType: "identity.principal.suspended.v1",
	occurredAt: "2026-09-08T12:00:00.000Z",
	payload: { principalId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
};

describe("eventing relay postgres integration", () => {
	test("relay marks outbox dispatched after publish", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withEventingPgHarness(async ({ pool }) => {
			await appendEventAtomic(pool, sampleEnvelope);
			const published: string[] = [];
			const publisher: OutboxPublisher = {
				async publish(envelope) {
					published.push(envelope.eventId);
				},
			};

			const result = await relayPendingOutbox({
				pool,
				publisher,
				retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
			});

			expect(result.dispatched).toBe(1);
			expect(published).toEqual([sampleEnvelope.eventId]);
			const pending = await fetchPendingOutbox(pool);
			expect(pending).toHaveLength(0);
		});
	});

	test("poison event moves to DLQ without blocking batch", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withEventingPgHarness(async ({ pool }) => {
			const poison: DomainEventEnvelope = {
				...sampleEnvelope,
				eventId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			};
			const healthy: DomainEventEnvelope = {
				...sampleEnvelope,
				eventId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
			};
			await appendEventAtomic(pool, poison);
			await appendEventAtomic(pool, healthy);

			const publisher: OutboxPublisher = {
				async publish(envelope) {
					if (envelope.eventId === poison.eventId) {
						throw new Error("poison");
					}
				},
			};

			const result = await relayPendingOutbox({
				pool,
				publisher,
				retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
				onPoison: async (envelope, error, attempts) => {
					await moveToDeadLetter(pool, envelope, String(error), attempts);
				},
			});

			expect(result.poisoned).toBe(1);
			expect(result.dispatched).toBe(1);
			const dlq = await pool.query(
				"SELECT event_id FROM dead_letter_queue WHERE event_id = $1",
				[poison.eventId],
			);
			expect(dlq.rowCount).toBe(1);
		});
	});

	test("processWithInbox is idempotent per consumer", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withEventingPgHarness(async ({ pool }) => {
			let handled = 0;
			const consumer = {
				name: "test-consumer",
				async handle() {
					handled += 1;
				},
			};

			const first = await processWithInbox(pool, consumer, sampleEnvelope);
			const second = await processWithInbox(pool, consumer, sampleEnvelope);

			expect(first).toBe("processed");
			expect(second).toBe("skipped");
			expect(handled).toBe(1);
		});
	});
});
