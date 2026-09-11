import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { IDENTITY_EVENT_TYPES } from "@anxionos/contracts/identity";
import {
	DEFAULT_NATS_EVENTS_STREAM,
	ensureEventsJetStream,
} from "@anxionos/eventing/nats-publisher";
import { createLogger } from "@anxionos/observability";
import { connect, JSONCodec, type NatsConnection } from "nats";
import type { SubscriptionManager } from "./subscription-manager";

const logger = createLogger({ service: "realtime-nats-bridge" });
const codec = JSONCodec<unknown>();

export interface RealtimeNatsBridgeHandle {
	stop: () => Promise<void>;
}

export async function startRealtimeNatsBridge(
	manager: SubscriptionManager,
): Promise<RealtimeNatsBridgeHandle> {
	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — realtime NATS bridge disabled");
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

	const sub = nc.subscribe("events.>");
	const agencySub = nc.subscribe("agency.*.events.>");

	const onMessage = (subject: string, data: Uint8Array) => {
		try {
			const raw = codec.decode(data);
			const envelope = domainEventEnvelopeSchema.parse(raw);
			const tenantId = envelope.agencyId ?? "platform";
			manager.publish({
				type: `notification.${envelope.eventType}`,
				channel: "notifications",
				tenantId,
				payload: {
					subject,
					eventType: envelope.eventType,
					eventId: envelope.eventId,
					payload: envelope.payload,
				},
				eventId: envelope.eventId,
			});
			if (envelope.eventType === IDENTITY_EVENT_TYPES.PRINCIPAL_SUSPENDED) {
				const authUserId = (envelope.payload as { authUserId?: string })
					.authUserId;
				if (authUserId) {
					manager.revokeUserStreams(authUserId, "principal.suspended");
				}
			}
		} catch (error) {
			logger.warn("Realtime NATS bridge skipped message", {
				subject,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	const pump = async (subscription: typeof sub) => {
		for await (const msg of subscription) {
			onMessage(msg.subject, msg.data);
		}
	};

	void pump(sub);
	void pump(agencySub);

	logger.info("Realtime NATS bridge started", { streamName });

	return {
		stop: async () => {
			await sub.drain();
			await agencySub.drain();
			await nc.drain();
		},
	};
}

export function bootstrapRealtimeNatsBridge(
	manager: SubscriptionManager,
): void {
	void startRealtimeNatsBridge(manager).catch((error: unknown) => {
		logger.error("Realtime NATS bridge failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
