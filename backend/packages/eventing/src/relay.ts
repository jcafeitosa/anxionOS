import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Pool } from "pg";
import {
	fetchPendingOutbox,
	markOutboxDispatched,
	markOutboxDispatchedForRelay,
	type Queryable,
} from "./postgres";
import { computeBackoffDelay, type RetryPolicy, shouldRetry } from "./retry";

export interface OutboxPublisher {
	publish(envelope: DomainEventEnvelope): Promise<void>;
}

export interface RelayWorkerOptions {
	pool: Pool;
	publisher: OutboxPublisher;
	batchSize?: number;
	/** Pre-claimed batch (skips fetchPendingOutbox). */
	pending?: readonly DomainEventEnvelope[];
	/** When set, dispatch marks require a valid lease held by this relay id. */
	relayId?: string;
	retryPolicy?: RetryPolicy;
	onPoison?: (
		envelope: DomainEventEnvelope,
		error: unknown,
		attempts: number,
	) => Promise<void>;
}

export interface RelayBatchResult {
	dispatched: number;
	failed: number;
	poisoned: number;
}

async function markRelayDispatched(
	pool: Pool,
	eventId: string,
	relayId: string | undefined,
): Promise<void> {
	if (relayId) {
		const marked = await markOutboxDispatchedForRelay(pool, eventId, relayId);
		if (!marked) {
			throw new Error(
				`Outbox dispatch fencing rejected for event ${eventId} and relay ${relayId}`,
			);
		}
		return;
	}
	await markOutboxDispatched(pool, eventId);
}

export async function relayPendingOutbox(
	options: RelayWorkerOptions,
): Promise<RelayBatchResult> {
	const {
		pool,
		publisher,
		batchSize = 50,
		pending: providedPending,
		relayId,
		retryPolicy,
		onPoison,
	} = options;
	const pending =
		providedPending ?? (await fetchPendingOutbox(pool, batchSize));
	let dispatched = 0;
	let failed = 0;
	let poisoned = 0;

	for (const envelope of pending) {
		let attempt = 0;
		let published = false;
		let lastError: unknown;

		while (!published && shouldRetry(attempt + 1, retryPolicy)) {
			attempt += 1;
			try {
				await publisher.publish(envelope);
				await markRelayDispatched(pool, envelope.eventId, relayId);
				dispatched += 1;
				published = true;
			} catch (error) {
				lastError = error;
				if (shouldRetry(attempt + 1, retryPolicy)) {
					await delay(computeBackoffDelay(attempt, retryPolicy));
				}
			}
		}

		if (!published) {
			failed += 1;
			if (onPoison) {
				await onPoison(envelope, lastError, attempt);
				poisoned += 1;
			}
		}
	}

	return { dispatched, failed, poisoned };
}

export async function moveToDeadLetter(
	queryable: Queryable,
	envelope: DomainEventEnvelope,
	reason: string,
	attempts: number,
): Promise<void> {
	await queryable.query(
		`INSERT INTO dead_letter_queue (event_id, owner_domain, event_type, schema_version, occurred_at, payload, reason, attempts)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
		 ON CONFLICT (event_id) DO UPDATE SET reason = EXCLUDED.reason, attempts = EXCLUDED.attempts, moved_at = NOW()`,
		[
			envelope.eventId,
			envelope.ownerDomain,
			envelope.eventType,
			envelope.schemaVersion,
			envelope.occurredAt,
			JSON.stringify(envelope.payload),
			reason,
			attempts,
		],
	);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
