import { PERFORMANCE_EVENT_TYPES } from "@anxionos/contracts/performance";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
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
	EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
	classifyEvaluationEventConsumerError,
	createEvaluationEventConsumerDeps,
	processEvaluationOutcomeRecordedEvent,
} from "./event-consumers";

const logger = createLogger({ service: "evaluation-event-consumers" });

const codec = JSONCodec<unknown>();

const EVALUATION_OUTCOME_RECORDED_DURABLE = "evaluation-outcome-recorded-v1";

export const EVALUATION_OUTCOME_RECORDED_SUBJECT = resolveEventSubject(
	PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED,
);

export interface EvaluationEventConsumersHandle {
	stop: () => Promise<void>;
}

async function createEvaluationJetStreamConsumer(
	nc: NatsConnection,
	streamName: string,
) {
	const jsm = await nc.jetstreamManager();
	const js = nc.jetstream();

	try {
		await jsm.consumers.add(streamName, {
			durable_name: EVALUATION_OUTCOME_RECORDED_DURABLE,
			filter_subject: EVALUATION_OUTCOME_RECORDED_SUBJECT,
			ack_policy: AckPolicy.Explicit,
			deliver_policy: DeliverPolicy.New,
		});
	} catch {
		// durable consumer may already exist from a prior process
	}

	const consumer = await js.consumers.get(
		streamName,
		EVALUATION_OUTCOME_RECORDED_DURABLE,
	);

	logger.info("Evaluation event consumer started", {
		stream: streamName,
		subject: EVALUATION_OUTCOME_RECORDED_SUBJECT,
		durable: EVALUATION_OUTCOME_RECORDED_DURABLE,
		consumer: EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
	});

	return consumer;
}

export async function startEvaluationEventConsumers(
	pool: Pool,
): Promise<{ stop: () => Promise<void> }> {
	if (process.env.EVALUATION_EVENT_CONSUMERS_DISABLED === "true") {
		logger.info("Evaluation event consumers disabled by env");
		return { stop: async () => {} };
	}

	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — evaluation event consumers disabled");
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

	const deps = createEvaluationEventConsumerDeps(pool);
	let aborted = false;

	const consumer = await createEvaluationJetStreamConsumer(nc, streamName);

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
						await processEvaluationOutcomeRecordedEvent(pool, deps, envelope);
						msg.ack();
					} catch (error) {
						const failureClass = classifyEvaluationEventConsumerError(error);
						if (failureClass === "permanent") {
							logger.warn(
								"Evaluation event message skipped (permanent failure)",
								{
									consumer: EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
									error: error instanceof Error ? error.message : String(error),
								},
							);
							msg.ack();
						} else {
							logger.error("Evaluation event message failed (transient)", {
								consumer: EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
								error: error instanceof Error ? error.message : String(error),
							});
							msg.nak();
						}
					}
				}
			} catch (error) {
				if (aborted) break;
				logger.error("Evaluation event consumer fetch failed", {
					consumer: EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
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

export function bootstrapEvaluationEventConsumers(pool: Pool): void {
	void startEvaluationEventConsumers(pool).catch((error: unknown) => {
		logger.error("Evaluation event consumers failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
