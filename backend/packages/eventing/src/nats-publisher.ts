import {
	assertTenantScopedEnvelopeAgencyId,
	type DomainEventEnvelope,
	domainEventEnvelopeSchema,
} from "@anxionos/contracts/events";
import {
	connect,
	type JetStreamManager,
	JSONCodec,
	type NatsConnection,
	StorageType,
} from "nats";
import type { OutboxPublisher } from "./relay";
import { DEFAULT_RETENTION_POLICY } from "./retention";

const codec = JSONCodec<DomainEventEnvelope>();

export const DEFAULT_NATS_EVENTS_STREAM = "EVENTS";

/** JetStream subjects for platform-wide and agency-scoped domain events.
 * `>` must be the last token; agency id is a single token (`*`). */
export const NATS_EVENTS_STREAM_SUBJECTS = ["events.>", "agency.*.events.>"];

export function resolveEventSubject(
	eventType: string,
	agencyId?: string,
): string {
	if (agencyId) {
		return `agency.${agencyId}.events.${eventType}`;
	}
	return `events.${eventType}`;
}

export async function ensureEventsJetStream(
	jsm: JetStreamManager,
	streamName: string,
): Promise<void> {
	try {
		const info = await jsm.streams.info(streamName);
		const existing = info.config.subjects ?? [];
		const merged = [...new Set([...existing, ...NATS_EVENTS_STREAM_SUBJECTS])];
		if (merged.length !== existing.length) {
			await jsm.streams.update(streamName, { subjects: merged });
		}
		return;
	} catch {
		await jsm.streams.add({
			name: streamName,
			subjects: [...NATS_EVENTS_STREAM_SUBJECTS],
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
			assertTenantScopedEnvelopeAgencyId(parsed);
			const subject = resolveEventSubject(parsed.eventType, parsed.agencyId);
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
