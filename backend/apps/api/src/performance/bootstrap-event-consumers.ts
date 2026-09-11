import { ACCOUNTING_EVENT_TYPES } from "@anxionos/contracts/accounting";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { PORTFOLIOS_EVENT_TYPES } from "@anxionos/contracts/portfolios";
import { createLogger } from "@anxionos/observability";
import {
	DEFAULT_NATS_EVENTS_STREAM,
	ensureEventsJetStream,
	resolveEventSubject,
} from "@anxionos/eventing/nats-publisher";
import {
	AckPolicy,
	DeliverPolicy,
	JSONCodec,
	type NatsConnection,
	connect,
} from "nats";
import type { Pool } from "pg";
import {
	PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME,
	PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME,
	classifyPerformanceEventConsumerError,
	createPerformanceEventConsumerDeps,
	processPerformanceLedgerPostedEvent,
	processPerformancePositionUpdatedEvent,
} from "./event-consumers";

const logger = createLogger({ service: "performance-event-consumers" });

const codec = JSONCodec<unknown>();

const PERFORMANCE_LEDGER_POSTED_DURABLE = "performance-ledger-posted-v1";
const PERFORMANCE_POSITION_UPDATED_DURABLE = "performance-position-updated-v1";

export const PERFORMANCE_LEDGER_POSTED_SUBJECT = resolveEventSubject(
	ACCOUNTING_EVENT_TYPES.LEDGER_POSTED,
);
export const PERFORMANCE_POSITION_UPDATED_SUBJECT = resolveEventSubject(
	PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED,
);

export interface PerformanceEventConsumersHandle {
	stop: () => Promise<void>;
}

interface PerformanceConsumerLoopConfig {
	durable: string;
	subject: string;
	consumerName: string;
	process: (
		pool: Pool,
		deps: ReturnType<typeof createPerformanceEventConsumerDeps>,
		envelope: unknown,
	) => Promise<"processed" | "skipped">;
}

async function createPerformanceJetStreamConsumer(
	nc: NatsConnection,
	streamName: string,
	config: Pick<PerformanceConsumerLoopConfig, "durable" | "subject" | "consumerName">,
) {
	const jsm = await nc.jetstreamManager();
	const js = nc.jetstream();

	try {
		await jsm.consumers.add(streamName, {
			durable_name: config.durable,
			filter_subject: config.subject,
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.New,
		});
	} catch {
		// durable consumer may already exist from a prior process
	}

	const consumer = await js.consumers.get(streamName, config.durable);

	logger.info("Performance event consumer started", {
		stream: streamName,
		subject: config.subject,
		durable: config.durable,
		consumer: config.consumerName,
	});

	return consumer;
}

function startPerformanceConsumerLoop(
	pool: Pool,
	deps: ReturnType<typeof createPerformanceEventConsumerDeps>,
	consumer: Awaited<ReturnType<typeof createPerformanceJetStreamConsumer>>,
	config: PerformanceConsumerLoopConfig,
	aborted: () => boolean,
): Promise<void> {
	return (async () => {
		while (!aborted()) {
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
						await config.process(pool, deps, envelope);
						msg.ack();
					} catch (error) {
						const failureClass = classifyPerformanceEventConsumerError(error);
						if (failureClass === "permanent") {
							logger.warn(
								"Performance event message skipped (permanent failure)",
								{
									consumer: config.consumerName,
									error: error instanceof Error ? error.message : String(error),
								},
							);
							msg.ack();
						} else {
							logger.error("Performance event message failed (transient)", {
								consumer: config.consumerName,
								error: error instanceof Error ? error.message : String(error),
							});
							msg.nak();
						}
					}
				}
			} catch (error) {
				if (aborted()) {
					break;
				}
				logger.error("Performance event consumer fetch failed", {
					consumer: config.consumerName,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	})();
}

export async function startPerformanceEventConsumers(
	pool: Pool,
): Promise<PerformanceEventConsumersHandle> {
	if (process.env.PERFORMANCE_EVENT_CONSUMERS_DISABLED === "true") {
		logger.info("Performance event consumers disabled by env");
		return { stop: async () => {} };
	}

	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — performance event consumers disabled");
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

	const deps = createPerformanceEventConsumerDeps(pool);
	let aborted = false;
	const isAborted = () => aborted;

	const [ledgerConsumer, positionConsumer] = await Promise.all([
		createPerformanceJetStreamConsumer(nc, streamName, {
			durable: PERFORMANCE_LEDGER_POSTED_DURABLE,
			subject: PERFORMANCE_LEDGER_POSTED_SUBJECT,
			consumerName: PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME,
		}),
		createPerformanceJetStreamConsumer(nc, streamName, {
			durable: PERFORMANCE_POSITION_UPDATED_DURABLE,
			subject: PERFORMANCE_POSITION_UPDATED_SUBJECT,
			consumerName: PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME,
		}),
	]);

	const ledgerLoop = startPerformanceConsumerLoop(
		pool,
		deps,
		ledgerConsumer,
		{
			durable: PERFORMANCE_LEDGER_POSTED_DURABLE,
			subject: PERFORMANCE_LEDGER_POSTED_SUBJECT,
			consumerName: PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME,
			process: processPerformanceLedgerPostedEvent,
		},
		isAborted,
	);
	const positionLoop = startPerformanceConsumerLoop(
		pool,
		deps,
		positionConsumer,
		{
			durable: PERFORMANCE_POSITION_UPDATED_DURABLE,
			subject: PERFORMANCE_POSITION_UPDATED_SUBJECT,
			consumerName: PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME,
			process: processPerformancePositionUpdatedEvent,
		},
		isAborted,
	);

	return {
		stop: async () => {
			aborted = true;
			await Promise.all([ledgerLoop, positionLoop]);
			await nc.drain();
		},
	};
}

export function bootstrapPerformanceEventConsumers(pool: Pool): void {
	void startPerformanceEventConsumers(pool).catch((error: unknown) => {
		logger.error("Performance event consumers failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
