import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import { createLogger } from "@anxionos/observability";
import {
	AckPolicy,
	connect,
	DeliverPolicy,
	JSONCodec,
	StorageType,
	type JetStreamManager,
	type NatsConnection,
} from "nats";
import type { Pool } from "pg";
import {
	createSessionRevocationConsumerDeps,
	IDENTITY_SESSIONS_CONSUMER_NAME,
	processIdentitySessionEvent,
} from "./session-revocation-consumer";

const logger = createLogger({
	
	service: "identity-session-revocation",
});

const codec = JSONCodec<unknown>();

export const DEFAULT_NATS_EVENTS_STREAM = "EVENTS";
const IDENTITY_SESSIONS_DURABLE = "identity-sessions-v1";
const IDENTITY_SUSPENDED_SUBJECT = `events.${IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED}`;

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
		});
		logger.info("Created JetStream EVENTS stream for identity consumer", {
			streamName,
		});
	}
}

export interface IdentitySessionRevocationHandle {
	stop: () => Promise<void>;
}

export async function startIdentitySessionRevocationConsumer(
	pool: Pool,
): Promise<IdentitySessionRevocationHandle> {
	if (process.env.IDENTITY_SESSION_CONSUMER_DISABLED === "true") {
		logger.info("Identity session revocation consumer disabled by env");
		return { stop: async () => {} };
	}

	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — identity session consumer disabled");
		return { stop: async () => {} };
	}

	const streamName =
		process.env.NATS_EVENTS_STREAM?.trim() ?? DEFAULT_NATS_EVENTS_STREAM;
	const nc: NatsConnection = await connect({
		servers: natsUrl,
		maxReconnectAttempts: -1,
	});
	const jsm = await nc.jetstreamManager();
	await ensureEventsJetStream(jsm, streamName);

	const js = nc.jetstream();
	const deps = createSessionRevocationConsumerDeps(pool);

	try {
		await jsm.consumers.add(streamName, {
			durable_name: IDENTITY_SESSIONS_DURABLE,
			filter_subject: IDENTITY_SUSPENDED_SUBJECT,
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.All,
		});
	} catch {
		// durable consumer may already exist from a prior process
	}

	const consumer = await js.consumers.get(streamName, IDENTITY_SESSIONS_DURABLE);
	let aborted = false;

	logger.info("Identity session revocation consumer started", {
		stream: streamName,
		subject: IDENTITY_SUSPENDED_SUBJECT,
		durable: IDENTITY_SESSIONS_DURABLE,
		consumer: IDENTITY_SESSIONS_CONSUMER_NAME,
	});

	const loop = (async () => {
		while (!aborted) {
			try {
				const messages = await consumer.fetch({
					max_messages: 10,
					expires: 2_000,
				});
				for await (const msg of messages) {
					try {
						const envelope = domainEventEnvelopeSchema.parse(
							codec.decode(msg.data),
						);
						await processIdentitySessionEvent(pool, deps, envelope);
						msg.ack();
					} catch (error) {
						logger.error("Identity session revocation message failed", {
							error: error instanceof Error ? error.message : String(error),
						});
						msg.nak();
					}
				}
			} catch (error) {
				if (aborted) {
					break;
				}
				logger.error("Identity session revocation fetch failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	})();

	return {
		stop: async () => {
			aborted = true;
			await loop;
			await nc.drain();
		},
	};
}

export function bootstrapIdentitySessionRevocation(pool: Pool): void {
	void startIdentitySessionRevocationConsumer(pool).catch((error: unknown) => {
		logger.error("Identity session revocation consumer failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
