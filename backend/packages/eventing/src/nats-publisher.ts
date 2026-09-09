import {
	domainEventEnvelopeSchema,
	type DomainEventEnvelope,
} from "@anxionos/contracts/events";
import {
	connect,
	JSONCodec,
	StorageType,
	type JetStreamManager,
	type NatsConnection,
} from "nats";
import { DEFAULT_RETENTION_POLICY } from "./retention";
import type { OutboxPublisher } from "./relay";

const codec = JSONCodec<DomainEventEnvelope>();

export const DEFAULT_NATS_EVENTS_STREAM = "EVENTS";

export function resolveEventSubject(eventType: string): string {
	return `events.${eventType}`;
}

export async function ensureEventsJetStream(
	jsm: JetStreamManager,
	streamName: string,
): Promise<void> {
	try {
		await jsm.streams.info(streamName);
		return;
	} catch {
		await jsm.streams.add({
			name: streamName,
			subjects: ["events.>"],
			storage: StorageType.File,
			max_age: DEFAULT_RETENTION_POLICY.jetStreamMaxAgeNs,
		});
	}
}

export interface NatsPublisherOptions {
	natsUrl: string;
	streamName?: string;
}

export interface NatsOutboxPublisherHandle {
	publisher: OutboxPublisher;
	close: () => Promise<void>;
}

export async function createNatsOutboxPublisher(
	options: NatsPublisherOptions,
): Promise<NatsOutboxPublisherHandle> {
	const streamName = options.streamName ?? DEFAULT_NATS_EVENTS_STREAM;
	const nc: NatsConnection = await connect({
		servers: options.natsUrl,
		maxReconnectAttempts: -1,
	});
	const jsm = await nc.jetstreamManager();
	await ensureEventsJetStream(jsm, streamName);
	const js = nc.jetstream();

	const publisher: OutboxPublisher = {
		async publish(envelope: DomainEventEnvelope): Promise<void> {
			const parsed = domainEventEnvelopeSchema.parse(envelope);
			const subject = resolveEventSubject(parsed.eventType);
			await js.publish(subject, codec.encode(parsed), {
				msgID: parsed.eventId,
			});
		},
	};

	return {
		publisher,
		close: async () => {
			await nc.drain();
		},
	};
}
