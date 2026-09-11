import { describe, expect, test } from "bun:test";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	createNatsOutboxPublisher,
	DEFAULT_NATS_EVENTS_STREAM,
	resolveEventSubject,
} from "@anxionos/eventing/nats-publisher";
import {
	appendEventAtomic,
	fetchPendingOutbox,
} from "@anxionos/eventing/postgres";
import { relayPendingOutbox } from "@anxionos/eventing/relay";
import { DEFAULT_RETRY_POLICY } from "@anxionos/eventing/retry";
import { AckPolicy, connect, DeliverPolicy, JSONCodec } from "nats";
import {
	getNatsUrl,
	shouldRunNatsIntegrationTests,
	withEventingPgHarness,
} from "./test-support";

const codec = JSONCodec<DomainEventEnvelope>();

function createSampleEnvelope(): DomainEventEnvelope {
	return {
		eventId: crypto.randomUUID(),
		schemaVersion: "0.1.0",
		ownerDomain: "identity",
		eventType: "identity.principal.suspended.v1",
		occurredAt: "2026-09-08T12:00:00.000Z",
		payload: { principalId: "ffffffff-ffff-4fff-8fff-ffffffffffff" },
	};
}

describe("eventing relay nats integration", () => {
	test("relay publishes to JetStream with eventId dedupe", async () => {
		if (!shouldRunNatsIntegrationTests()) {
			return;
		}

		const natsUrl = getNatsUrl();
		if (!natsUrl) {
			return;
		}

		const streamName =
			process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM;
		const durable = `relay_test_${crypto.randomUUID().replace(/-/g, "")}`;
		const sampleEnvelope = createSampleEnvelope();
		const subject = resolveEventSubject(sampleEnvelope.eventType);

		await withEventingPgHarness(async ({ pool }) => {
			const { publisher, close } = await createNatsOutboxPublisher({
				natsUrl,
				streamName,
			});

			const nc = await connect({ servers: natsUrl });
			const js = nc.jetstream();
			const jsm = await nc.jetstreamManager();
			try {
				await jsm.consumers.add(streamName, {
					durable_name: durable,
					filter_subject: subject,
					ack_policy: AckPolicy.Explicit,
					deliver_policy: DeliverPolicy.New,
				});
			} catch {
				// consumer may already exist from a prior failed run
			}
			const consumer = await js.consumers.get(streamName, durable);

			await appendEventAtomic(pool, sampleEnvelope);
			const result = await relayPendingOutbox({
				pool,
				publisher,
				retryPolicy: DEFAULT_RETRY_POLICY,
			});
			expect(result.dispatched).toBe(1);

			const messages = await consumer.fetch({
				max_messages: 1,
				expires: 5_000,
			});
			const received: DomainEventEnvelope[] = [];
			for await (const msg of messages) {
				received.push(codec.decode(msg.data));
				msg.ack();
			}
			expect(received).toHaveLength(1);
			expect(received[0]?.eventId).toBe(sampleEnvelope.eventId);

			const pending = await fetchPendingOutbox(pool);
			expect(pending).toHaveLength(0);

			await close();
			try {
				await jsm.consumers.delete(streamName, durable);
			} catch {
				// best-effort cleanup
			}
			await nc.drain();
		});
	});
});
