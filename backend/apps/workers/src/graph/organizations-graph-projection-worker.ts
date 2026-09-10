/**
 * ANX-257 — NATS consumer for organizations graph projection (agency-scoped subjects).
 */
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import {
	GRAPH_PROJECTION_DEFAULT_CHECKPOINT,
	type GraphStore,
	handleProjectionMessage,
	organizationsProjectionConsumer,
} from "@anxionos/graph";
import { createLogger } from "@anxionos/observability";
import { AckPolicy, DeliverPolicy, JSONCodec, type JsMsg, connect } from "nats";
import type { Pool } from "pg";
import {
	DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	type GraphGovernanceWorkerConfig,
} from "../config";

const logger = createLogger({ service: "graph-organizations-projection" });
const codec = JSONCodec();

const ORGANIZATIONS_PROJECTION_EVENT_TYPES = new Set<string>([
	ORGANIZATION_EVENT_TYPES.AGENCY_CREATED,
	ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
]);

export interface OrganizationsProjectionConsumerHandle {
	stop(): Promise<void>;
}

function createNatsMessagePortFromJsMsg(msg: JsMsg) {
	return {
		ack() {
			msg.ack();
		},
		nak(delayMs?: number) {
			msg.nak(delayMs);
		},
	};
}

function parseDomainEventFromNatsData(data: Uint8Array) {
	return domainEventEnvelopeSchema.parse(codec.decode(data));
}

function resolveCheckpointFromNatsMessage(msg: JsMsg): number {
	const raw = msg.headers?.get("X-Event-Checkpoint");
	if (!raw) {
		return GRAPH_PROJECTION_DEFAULT_CHECKPOINT;
	}
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed < 0) {
		return GRAPH_PROJECTION_DEFAULT_CHECKPOINT;
	}
	return parsed;
}

export async function processOrganizationsGraphNatsMessage(input: {
	pool: Pool;
	graphStore: GraphStore;
	msg: JsMsg;
}) {
	const envelope = parseDomainEventFromNatsData(input.msg.data);
	if (envelope.ownerDomain !== organizationsProjectionConsumer.ownerDomain) {
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	if (!ORGANIZATIONS_PROJECTION_EVENT_TYPES.has(envelope.eventType)) {
		logger.info(
			"Skipping organizations event not handled by graph:organizations:v1",
			{
				eventType: envelope.eventType,
				eventId: envelope.eventId,
				agencyId: envelope.agencyId,
			},
		);
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	return handleProjectionMessage({
		pool: input.pool,
		graphStore: input.graphStore,
		consumer: organizationsProjectionConsumer,
		envelope,
		checkpoint: resolveCheckpointFromNatsMessage(input.msg),
		message: createNatsMessagePortFromJsMsg(input.msg),
	});
}

async function assertJetStreamStream(
	jsm: Awaited<
		ReturnType<Awaited<ReturnType<typeof connect>>["jetstreamManager"]>
	>,
	streamName: string,
) {
	try {
		await jsm.streams.info(streamName);
	} catch {
		throw new Error(
			`NATS JetStream stream "${streamName}" not found — start outbox relay / deploy stack first`,
		);
	}
}

export async function startOrganizationsProjectionConsumer(input: {
	config: GraphGovernanceWorkerConfig;
	pool: Pool;
	graphStore: GraphStore;
	signal?: AbortSignal;
}): Promise<OrganizationsProjectionConsumerHandle> {
	const nc = await connect({
		servers: input.config.natsUrl,
		maxReconnectAttempts: DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	});
	const jsm = await nc.jetstreamManager();
	await assertJetStreamStream(jsm, input.config.eventsStream);
	const js = nc.jetstream();
	const sub = await js.subscribe(input.config.organizationsSubject, {
		queue: input.config.organizationsDurable,
		config: {
			durable_name: input.config.organizationsDurable,
			filter_subjects: [input.config.organizationsSubject],
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.All,
		},
		mack: true,
	});

	logger.info("Organizations graph projection consumer started", {
		stream: input.config.eventsStream,
		subject: input.config.organizationsSubject,
		durable: input.config.organizationsDurable,
		consumer: organizationsProjectionConsumer.consumerName,
	});

	const loop = (async () => {
		for await (const msg of sub) {
			if (input.signal?.aborted) {
				break;
			}
			try {
				const result = await processOrganizationsGraphNatsMessage({
					pool: input.pool,
					graphStore: input.graphStore,
					msg,
				});
				logger.debug("Organizations graph projection message processed", {
					status: result.status,
				});
			} catch (error) {
				logger.error("Organizations graph projection message failed", {
					error: error instanceof Error ? error.message : String(error),
				});
				msg.nak();
			}
		}
	})();

	return {
		stop: async () => {
			await sub.drain();
			await loop;
			await nc.drain();
		},
	};
}
