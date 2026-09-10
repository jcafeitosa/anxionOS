/**
 * ANX-277 — NATS JetStream consumers for Product+Agent Graph projection (sandbox).
 * Importers: `backend/apps/workers/src/index.ts` (`WORKER_PROFILE=graph-product-projection`).
 * Events: `product.work_item.status_changed.v1`, `agents.decision.recorded.v1`, `agents.agent.role_assigned.v1`.
 * User instruction (goal): "somente depois da documentação aprovada, desenvolver a plataforma incrementalmente" — slice ANX-277 projection worker.
 */
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { AGENTS_EVENT_TYPES } from "@anxionos/contracts/agents";
import {
	AGENT_GRAPH_EVENT_TYPES,
	PRODUCT_GRAPH_EVENT_TYPES,
} from "@anxionos/contracts/graph";
import {
	GRAPH_PROJECTION_DEFAULT_CHECKPOINT,
	type GraphStore,
	agentProjectionConsumer,
	handleProjectionMessage,
	productProjectionConsumer,
} from "@anxionos/graph";
import { createLogger } from "@anxionos/observability";
import { AckPolicy, DeliverPolicy, JSONCodec, type JsMsg, connect } from "nats";
import type { Pool } from "pg";
import {
	DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	type GraphProductWorkerConfig,
} from "../config";

const logger = createLogger({ service: "graph-product-projection" });
const codec = JSONCodec();

const PRODUCT_PROJECTION_EVENT_TYPES = new Set<string>([
	PRODUCT_GRAPH_EVENT_TYPES.WORK_ITEM_STATUS_CHANGED,
	PRODUCT_GRAPH_EVENT_TYPES.INTELLIGENCE_FEEDS_BACK,
]);

const AGENT_PROJECTION_EVENT_TYPES = new Set<string>([
	AGENT_GRAPH_EVENT_TYPES.DECISION_RECORDED,
	AGENT_GRAPH_EVENT_TYPES.AGENT_ROLE_ASSIGNED,
	AGENTS_EVENT_TYPES.AGENT_REGISTERED,
	AGENTS_EVENT_TYPES.AGENT_STATUS_CHANGED,
	AGENTS_EVENT_TYPES.AGENT_VERSION_PUBLISHED,
	AGENTS_EVENT_TYPES.AGENT_VERSION_ROLLED_BACK,
]);

export interface ProductGraphProjectionConsumerHandle {
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

export async function processProductGraphNatsMessage(input: {
	pool: Pool;
	graphStore: GraphStore;
	msg: JsMsg;
}) {
	const envelope = parseDomainEventFromNatsData(input.msg.data);
	if (envelope.ownerDomain !== productProjectionConsumer.ownerDomain) {
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	if (!PRODUCT_PROJECTION_EVENT_TYPES.has(envelope.eventType)) {
		logger.info("Skipping product event not handled by graph:product:v1", {
			eventType: envelope.eventType,
			eventId: envelope.eventId,
		});
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	return handleProjectionMessage({
		pool: input.pool,
		graphStore: input.graphStore,
		consumer: productProjectionConsumer,
		envelope,
		checkpoint: resolveCheckpointFromNatsMessage(input.msg),
		message: createNatsMessagePortFromJsMsg(input.msg),
	});
}

export async function processAgentGraphNatsMessage(input: {
	pool: Pool;
	graphStore: GraphStore;
	msg: JsMsg;
}) {
	const envelope = parseDomainEventFromNatsData(input.msg.data);
	if (envelope.ownerDomain !== agentProjectionConsumer.ownerDomain) {
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	if (!AGENT_PROJECTION_EVENT_TYPES.has(envelope.eventType)) {
		logger.info("Skipping agents event not handled by graph:agents:v1", {
			eventType: envelope.eventType,
			eventId: envelope.eventId,
		});
		input.msg.ack();
		return { status: "duplicate" as const };
	}
	return handleProjectionMessage({
		pool: input.pool,
		graphStore: input.graphStore,
		consumer: agentProjectionConsumer,
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

export async function startProductGraphProjectionConsumers(input: {
	config: GraphProductWorkerConfig;
	pool: Pool;
	graphStore: GraphStore;
	signal?: AbortSignal;
}): Promise<ProductGraphProjectionConsumerHandle> {
	const nc = await connect({
		servers: input.config.natsUrl,
		maxReconnectAttempts: DEFAULT_NATS_MAX_RECONNECT_ATTEMPTS,
	});
	const jsm = await nc.jetstreamManager();
	await assertJetStreamStream(jsm, input.config.eventsStream);
	const js = nc.jetstream();

	const productSub = await js.subscribe(input.config.productSubject, {
		queue: input.config.productDurable,
		config: {
			durable_name: input.config.productDurable,
			filter_subjects: [input.config.productSubject],
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.All,
		},
		mack: true,
	});

	const agentsSub = await js.subscribe(input.config.agentsSubject, {
		queue: input.config.agentsDurable,
		config: {
			durable_name: input.config.agentsDurable,
			filter_subjects: [input.config.agentsSubject],
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.All,
		},
		mack: true,
	});

	logger.info("Product/Agent graph projection consumers started", {
		stream: input.config.eventsStream,
		productSubject: input.config.productSubject,
		agentsSubject: input.config.agentsSubject,
		productConsumer: productProjectionConsumer.consumerName,
		agentsConsumer: agentProjectionConsumer.consumerName,
	});

	const productLoop = (async () => {
		for await (const msg of productSub) {
			if (input.signal?.aborted) {
				break;
			}
			try {
				const result = await processProductGraphNatsMessage({
					pool: input.pool,
					graphStore: input.graphStore,
					msg,
				});
				logger.debug("Product graph projection message processed", {
					status: result.status,
				});
			} catch (error) {
				logger.error("Product graph projection message failed", {
					error: error instanceof Error ? error.message : String(error),
				});
				msg.nak();
			}
		}
	})();

	const agentsLoop = (async () => {
		for await (const msg of agentsSub) {
			if (input.signal?.aborted) {
				break;
			}
			try {
				const result = await processAgentGraphNatsMessage({
					pool: input.pool,
					graphStore: input.graphStore,
					msg,
				});
				logger.debug("Agent graph projection message processed", {
					status: result.status,
				});
			} catch (error) {
				logger.error("Agent graph projection message failed", {
					error: error instanceof Error ? error.message : String(error),
				});
				msg.nak();
			}
		}
	})();

	return {
		stop: async () => {
			await productSub.drain();
			await agentsSub.drain();
			await productLoop;
			await agentsLoop;
			await nc.drain();
		},
	};
}
