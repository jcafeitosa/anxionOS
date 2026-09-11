import { createNatsOutboxPublisher } from "@anxionos/eventing/nats-publisher";
import {
	createDefaultPoisonHandler,
	type OutboxRelayWorkerHandle,
	startOutboxRelayWorker,
} from "@anxionos/eventing/outbox-relay-worker";
import { DEFAULT_RETRY_POLICY } from "@anxionos/eventing/retry";
import { createLogger } from "@anxionos/observability";
import type { Pool } from "pg";
import type { OutboxRelayWorkerConfig } from "../config";

export const OUTBOX_RELAY_WORKER_NAME = "apps/workers:outbox-relay:v1";

const logger = createLogger({ service: "outbox-relay" });

export interface OutboxRelayRuntimeHandle {
	stop(): Promise<void>;
}

export async function startAppOutboxRelayWorker(input: {
	config: OutboxRelayWorkerConfig;
	pool: Pool;
	signal?: AbortSignal;
}): Promise<OutboxRelayRuntimeHandle> {
	const { publisher, close } = await createNatsOutboxPublisher({
		natsUrl: input.config.natsUrl,
		streamName: input.config.eventsStream,
	});
	const onPoison = createDefaultPoisonHandler(input.pool);
	const relay: OutboxRelayWorkerHandle = startOutboxRelayWorker({
		pool: input.pool,
		publisher,
		signal: input.signal,
		config: {
			relayId: OUTBOX_RELAY_WORKER_NAME,
			pollIntervalMs: input.config.pollIntervalMs,
			batchSize: input.config.batchSize,
			leaseTtlMs: input.config.leaseTtlMs,
			retryPolicy: DEFAULT_RETRY_POLICY,
		},
		onPoison,
		logger,
	});

	logger.info("Outbox relay worker started", {
		stream: input.config.eventsStream,
		pollIntervalMs: input.config.pollIntervalMs,
		batchSize: input.config.batchSize,
		leaseTtlMs: input.config.leaseTtlMs,
		worker: OUTBOX_RELAY_WORKER_NAME,
	});

	return {
		stop: async () => {
			await relay.stop();
			await close();
		},
	};
}
