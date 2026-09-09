import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Pool } from "pg";
import {
	claimPendingOutboxForRelay,
	releaseOutboxRelayClaims,
	renewOutboxRelayLeases,
} from "./postgres";
import {
	moveToDeadLetter,
	relayPendingOutbox,
	type OutboxPublisher,
	type RelayBatchResult,
} from "./relay";
import { DEFAULT_RETRY_POLICY, type RetryPolicy } from "./retry";

export interface OutboxRelayWorkerLogger {
	info(message: string, meta?: Record<string, unknown>): void;
	error(message: string, meta?: Record<string, unknown>): void;
}

export interface OutboxRelayWorkerConfig {
	relayId: string;
	pollIntervalMs: number;
	batchSize: number;
	leaseTtlMs: number;
	retryPolicy?: RetryPolicy;
}

export interface OutboxRelayWorkerOptions {
	pool: Pool;
	publisher: OutboxPublisher;
	config: OutboxRelayWorkerConfig;
	signal?: AbortSignal;
	onPoison?: (
		envelope: DomainEventEnvelope,
		error: unknown,
		attempts: number,
	) => Promise<void>;
	logger?: OutboxRelayWorkerLogger;
}

export interface OutboxRelayWorkerHandle {
	stop(): Promise<void>;
}

export const DEFAULT_OUTBOX_RELAY_LEASE_TTL_MS = 30_000;

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});
}

export async function runOutboxRelayBatch(
	options: OutboxRelayWorkerOptions,
): Promise<RelayBatchResult> {
	const { pool, publisher, config } = options;
	const pending = await claimPendingOutboxForRelay(
		pool,
		config.relayId,
		config.leaseTtlMs,
		config.batchSize,
	);
	if (pending.length === 0) {
		return { dispatched: 0, failed: 0, poisoned: 0 };
	}

	const eventIds = pending.map((envelope) => envelope.eventId);
	await renewOutboxRelayLeases(
		pool,
		config.relayId,
		config.leaseTtlMs,
		eventIds,
	);

	try {
		return await relayPendingOutbox({
			pool,
			publisher,
			pending,
			relayId: config.relayId,
			retryPolicy: config.retryPolicy ?? DEFAULT_RETRY_POLICY,
			onPoison: options.onPoison,
		});
	} finally {
		await releaseOutboxRelayClaims(pool, config.relayId, eventIds);
	}
}

export function startOutboxRelayWorker(
	options: OutboxRelayWorkerOptions,
): OutboxRelayWorkerHandle {
	if (!options.onPoison) {
		throw new Error(
			"Outbox relay worker requires onPoison DLQ callback — wire createDefaultPoisonHandler or a custom handler",
		);
	}
	let stopRequested = false;
	let loopPromise: Promise<void> | undefined;
	let stopPromise: Promise<void> | undefined;

	const runLoop = async () => {
		while (!stopRequested && !options.signal?.aborted) {
			try {
				const result = await runOutboxRelayBatch(options);
				if (result.dispatched + result.failed + result.poisoned > 0) {
					options.logger?.info("Outbox relay batch complete", { ...result });
				}
			} catch (error) {
				options.logger?.error("Outbox relay batch failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
			await sleepWithAbort(options.config.pollIntervalMs, options.signal);
		}
	};

	loopPromise = runLoop();

	return {
		stop: async () => {
			if (stopPromise) {
				return stopPromise;
			}
			stopPromise = (async () => {
				stopRequested = true;
				await loopPromise;
				await releaseOutboxRelayClaims(
					options.pool,
					options.config.relayId,
				);
			})();
			return stopPromise;
		},
	};
}

export function createDefaultPoisonHandler(pool: Pool) {
	return async (
		envelope: DomainEventEnvelope,
		error: unknown,
		attempts: number,
	) => {
		await moveToDeadLetter(pool, envelope, String(error), attempts);
	};
}
