import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	appendEventAtomic,
	claimPendingOutboxForRelay,
	markOutboxDispatchedForRelay,
	releaseOutboxRelayClaims,
} from "@anxionos/eventing/postgres";
import {
	type OutboxPublisher,
	relayPendingOutbox,
} from "@anxionos/eventing/relay";
import { DEFAULT_RETRY_POLICY } from "@anxionos/eventing/retry";
import {
	shouldRunPgIntegrationTests,
	withEventingPgHarness,
} from "./test-support";

const sampleEnvelope: DomainEventEnvelope = {
	eventId: "99999999-9999-4999-8999-999999999999",
	schemaVersion: "0.1.0",
	ownerDomain: "identity",
	eventType: "identity.principal.suspended.v1",
	occurredAt: "2026-09-08T12:00:00.000Z",
	payload: { principalId: "88888888-8888-4888-8888-888888888888" },
};

describe("outbox relay lease integration", () => {
	test("claim orders by owner_domain and fences stale relay marks", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withEventingPgHarness(async ({ pool }) => {
			await appendEventAtomic(pool, sampleEnvelope);
			const claimed = await claimPendingOutboxForRelay(
				pool,
				"relay-a",
				30_000,
				10,
			);
			expect(claimed).toHaveLength(1);
			expect(claimed[0]?.eventId).toBe(sampleEnvelope.eventId);

			const rejected = await markOutboxDispatchedForRelay(
				pool,
				sampleEnvelope.eventId,
				"relay-b",
			);
			expect(rejected).toBe(false);

			const publisher: OutboxPublisher = {
				async publish() {},
			};
			const result = await relayPendingOutbox({
				pool,
				publisher,
				pending: claimed,
				relayId: "relay-a",
				retryPolicy: { ...DEFAULT_RETRY_POLICY, maxAttempts: 2 },
			});
			expect(result.dispatched).toBe(1);

			const secondClaim = await claimPendingOutboxForRelay(
				pool,
				"relay-b",
				30_000,
				10,
			);
			expect(secondClaim).toHaveLength(0);
		});
	});

	test("expired lease can be reclaimed by another relay", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withEventingPgHarness(async ({ pool }) => {
			await appendEventAtomic(pool, sampleEnvelope);
			await claimPendingOutboxForRelay(pool, "relay-a", 1, 10);
			await new Promise((resolve) => setTimeout(resolve, 5));
			await releaseOutboxRelayClaims(pool, "relay-a");
			const reclaimed = await claimPendingOutboxForRelay(
				pool,
				"relay-b",
				30_000,
				10,
			);
			expect(reclaimed).toHaveLength(1);
		});
	});
});
