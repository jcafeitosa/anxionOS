import { createLogger } from "@anxionos/observability";
import {
	bootstrapGraphGovernanceWorker,
	bootstrapOutboxRelayWorker,
	shutdownGraphGovernanceWorker,
	shutdownOutboxRelayWorker,
} from "./bootstrap";
import {
	loadGraphGovernanceWorkerConfig,
	loadOutboxRelayWorkerConfig,
	WORKER_PROFILE_GRAPH_GOVERNANCE,
	WORKER_PROFILE_OUTBOX_RELAY,
} from "./config";
import { startAppOutboxRelayWorker } from "./eventing/outbox-relay-worker";
import { startGovernanceProjectionConsumer } from "./graph/governance-projection-worker";

const logger = createLogger({ service: "workers-root" });

async function main(): Promise<void> {
	const profile =
		process.env.WORKER_PROFILE?.trim() ?? WORKER_PROFILE_GRAPH_GOVERNANCE;
	const abortController = new AbortController();
	let shuttingDown = false;

	if (profile === WORKER_PROFILE_GRAPH_GOVERNANCE) {
		const config = loadGraphGovernanceWorkerConfig();
		const runtime = await bootstrapGraphGovernanceWorker(config);
		const consumer = await startGovernanceProjectionConsumer({
			config,
			pool: runtime.pool,
			graphStore: runtime.graphStore,
			signal: abortController.signal,
		});

		const shutdown = async (signal: string) => {
			if (shuttingDown) {
				return;
			}
			shuttingDown = true;
			logger.info("Workers shutting down", { signal, profile: config.profile });
			abortController.abort();
			await consumer.stop();
			await shutdownGraphGovernanceWorker(runtime);
			process.exit(0);
		};

		process.on("SIGINT", () => void shutdown("SIGINT"));
		process.on("SIGTERM", () => void shutdown("SIGTERM"));
		logger.info("Workers running", { profile: config.profile });
		return;
	}

	if (profile === WORKER_PROFILE_OUTBOX_RELAY) {
		const config = loadOutboxRelayWorkerConfig();
		const runtime = await bootstrapOutboxRelayWorker(config);
		const relay = await startAppOutboxRelayWorker({
			config,
			pool: runtime.pool,
			signal: abortController.signal,
		});

		const shutdown = async (signal: string) => {
			if (shuttingDown) {
				return;
			}
			shuttingDown = true;
			logger.info("Workers shutting down", { signal, profile: config.profile });
			abortController.abort();
			await relay.stop();
			await shutdownOutboxRelayWorker(runtime);
			process.exit(0);
		};

		process.on("SIGINT", () => void shutdown("SIGINT"));
		process.on("SIGTERM", () => void shutdown("SIGTERM"));
		logger.info("Workers running", { profile: config.profile });
		return;
	}

	throw new Error(
		`Unsupported WORKER_PROFILE "${profile}" — expected ${WORKER_PROFILE_GRAPH_GOVERNANCE} or ${WORKER_PROFILE_OUTBOX_RELAY}`,
	);
}

if (import.meta.main) {
	main().catch((error) => {
		logger.error("Workers failed to start", {
			error: error instanceof Error ? error.message : String(error),
		});
		process.exit(1);
	});
}
