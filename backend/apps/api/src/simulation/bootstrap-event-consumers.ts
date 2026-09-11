import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { SIMULATION_EVENT_TYPES } from "@anxionos/contracts/simulation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	DEFAULT_NATS_EVENTS_STREAM,
	ensureEventsJetStream,
	resolveEventSubject,
} from "@anxionos/eventing/nats-publisher";
import { createLogger } from "@anxionos/observability";
import {
	AckPolicy,
	connect,
	DeliverPolicy,
	JSONCodec,
	type NatsConnection,
} from "nats";
import type { Pool } from "pg";
import {
	classifySimulationEventConsumerError,
	createSimulationEventConsumerDeps,
	processSimulationBacktestRequestedEvent,
	processSimulationRunStartedEvent,
	SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
	SIMULATION_RUN_STARTED_CONSUMER_NAME,
} from "./event-consumers";

const logger = createLogger({ service: "simulation-event-consumers" });

const codec = JSONCodec<unknown>();

const SIMULATION_BACKTEST_REQUESTED_DURABLE =
	"simulation-backtest-requested-v1";
const SIMULATION_RUN_STARTED_DURABLE = "simulation-run-started-v1";

export const SIMULATION_BACKTEST_REQUESTED_SUBJECT = resolveEventSubject(
	STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED,
);
export const SIMULATION_RUN_STARTED_SUBJECT = resolveEventSubject(
	SIMULATION_EVENT_TYPES.RUN_STARTED,
);

export interface SimulationEventConsumersHandle {
	stop: () => Promise<void>;
}

interface SimulationConsumerLoopConfig {
	durable: string;
	subject: string;
	consumerName: string;
	process: (
		pool: Pool,
		deps: ReturnType<typeof createSimulationEventConsumerDeps>,
		envelope: unknown,
	) => Promise<"processed" | "skipped">;
}

async function createSimulationJetStreamConsumer(
	nc: NatsConnection,
	streamName: string,
	config: Pick<
		SimulationConsumerLoopConfig,
		"durable" | "subject" | "consumerName"
	>,
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

	logger.info("Simulation event consumer started", {
		stream: streamName,
		subject: config.subject,
		durable: config.durable,
		consumer: config.consumerName,
	});

	return consumer;
}

function startSimulationConsumerLoop(
	pool: Pool,
	deps: ReturnType<typeof createSimulationEventConsumerDeps>,
	consumer: Awaited<ReturnType<typeof createSimulationJetStreamConsumer>>,
	config: SimulationConsumerLoopConfig,
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
						const failureClass = classifySimulationEventConsumerError(error);
						if (failureClass === "permanent") {
							logger.warn(
								"Simulation event message skipped (permanent failure)",
								{
									consumer: config.consumerName,
									error: error instanceof Error ? error.message : String(error),
								},
							);
							msg.ack();
						} else {
							logger.error("Simulation event message failed (transient)", {
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
				logger.error("Simulation event consumer fetch failed", {
					consumer: config.consumerName,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	})();
}

export async function startSimulationEventConsumers(
	pool: Pool,
): Promise<SimulationEventConsumersHandle> {
	if (process.env.SIMULATION_EVENT_CONSUMERS_DISABLED === "true") {
		logger.info("Simulation event consumers disabled by env");
		return { stop: async () => {} };
	}

	const natsUrl = process.env.NATS_URL?.trim();
	if (!natsUrl) {
		logger.info("NATS_URL unset — simulation event consumers disabled");
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

	const deps = createSimulationEventConsumerDeps(pool);
	let aborted = false;
	const isAborted = () => aborted;

	const backtestConsumer = await createSimulationJetStreamConsumer(
		nc,
		streamName,
		{
			durable: SIMULATION_BACKTEST_REQUESTED_DURABLE,
			subject: SIMULATION_BACKTEST_REQUESTED_SUBJECT,
			consumerName: SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
		},
	);

	const backtestLoop = startSimulationConsumerLoop(
		pool,
		deps,
		backtestConsumer,
		{
			durable: SIMULATION_BACKTEST_REQUESTED_DURABLE,
			subject: SIMULATION_BACKTEST_REQUESTED_SUBJECT,
			consumerName: SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
			process: processSimulationBacktestRequestedEvent,
		},
		isAborted,
	);

	const runStartedConsumer = await createSimulationJetStreamConsumer(
		nc,
		streamName,
		{
			durable: SIMULATION_RUN_STARTED_DURABLE,
			subject: SIMULATION_RUN_STARTED_SUBJECT,
			consumerName: SIMULATION_RUN_STARTED_CONSUMER_NAME,
		},
	);

	const runStartedLoop = startSimulationConsumerLoop(
		pool,
		deps,
		runStartedConsumer,
		{
			durable: SIMULATION_RUN_STARTED_DURABLE,
			subject: SIMULATION_RUN_STARTED_SUBJECT,
			consumerName: SIMULATION_RUN_STARTED_CONSUMER_NAME,
			process: processSimulationRunStartedEvent,
		},
		isAborted,
	);

	return {
		stop: async () => {
			aborted = true;
			await Promise.all([backtestLoop, runStartedLoop]);
			await nc.drain();
		},
	};
}

export function bootstrapSimulationEventConsumers(pool: Pool): void {
	void startSimulationEventConsumers(pool).catch((error: unknown) => {
		logger.error("Simulation event consumers failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
	});
}
