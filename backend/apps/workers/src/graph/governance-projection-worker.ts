import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { GOVERNANCE_EVENT_TYPES } from "@anxionos/contracts/governance";
import {
	GRAPH_PROJECTION_DEFAULT_CHECKPOINT,
	type GraphStore,
	governanceProjectionConsumer,
	handleProjectionMessage,
} from "@anxionos/graph";
import { createLogger } from "@anxionos/observability";
import { AckPolicy, connect, DeliverPolicy, JSONCodec, type JsMsg } from "nats";
import type { Pool } from "pg";
import {
	DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	type GraphGovernanceWorkerConfig,
} from "../config";

const logger = createLogger({ service: "graph-governance-projection" });
const codec = JSONCodec();

const GOVERNANCE_PROJECTION_EVENT_TYPES = new Set<string>([
	GOVERNANCE_EVENT_TYPES.GRANT_ISSUED,
	GOVERNANCE_EVENT_TYPES.GRANT_REVOKED,
]);

export interface GovernanceProjectionConsumerHandle {
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

export async function processGovernanceNatsMessage(input: {
	pool: Pool;
	graphStore: GraphStore;
	msg: JsMsg;
}) {
	const envelope = parseDomainEventFromNatsData(input.msg.data);
	if (envelope.ownerDomain !== governanceProjectionConsumer.ownerDomain) {
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	if (!GOVERNANCE_PROJECTION_EVENT_TYPES.has(envelope.eventType)) {
		logger.info(
			"Skipping governance event not handled by graph:governance:v1",
			{
				eventType: envelope.eventType,
				eventId: envelope.eventId,
			},
		);
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	return handleProjectionMessage({
		pool: input.pool,
		graphStore: input.graphStore,
		consumer: governanceProjectionConsumer,
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

export async function startGovernanceProjectionConsumer(input: {
	config: GraphGovernanceWorkerConfig;
	pool: Pool;
	graphStore: GraphStore;
	signal?: AbortSignal;
}): Promise<GovernanceProjectionConsumerHandle> {
	const nc = await connect({
		servers: input.config.natsUrl,
		maxReconnectAttempts: DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	});
	const jsm = await nc.jetstreamManager();
	await assertJetStreamStream(jsm, input.config.eventsStream);
	const js = nc.jetstream();
	const sub = await js.subscribe(input.config.governanceSubject, {
		queue: input.config.governanceDurable,
		config: {
			durable_name: input.config.governanceDurable,
			filter_subjects: [input.config.governanceSubject],
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.All,
		},
		mack: true,
	});

	logger.info("Governance projection consumer started", {
		stream: input.config.eventsStream,
		subject: input.config.governanceSubject,
		durable: input.config.governanceDurable,
		consumer: governanceProjectionConsumer.consumerName,
	});

	const loop = (async () => {
		for await (const msg of sub) {
			if (input.signal?.aborted) {
				break;
			}
			try {
				const result = await processGovernanceNatsMessage({
					pool: input.pool,
					graphStore: input.graphStore,
					msg,
				});
				logger.debug("Governance projection message processed", {
					status: result.status,
				});
			} catch (error) {
				logger.error("Governance projection message failed", {
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
