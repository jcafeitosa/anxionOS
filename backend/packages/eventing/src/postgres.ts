import {
	type DomainEventEnvelope,
	domainEventEnvelopeSchema,
} from "@anxionos/contracts/events";
import { Pool, type PoolClient } from "pg";
import { EVENTING_DDL } from "./schema";

export type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

function rowToEnvelope(row: {
	event_id: string;
	schema_version: string;
	owner_domain: string;
	event_type: string;
	occurred_at: Date;
	payload: unknown;
}): DomainEventEnvelope {
	return domainEventEnvelopeSchema.parse({
		eventId: row.event_id,
		schemaVersion: row.schema_version,
		ownerDomain: row.owner_domain,
		eventType: row.event_type,
		occurredAt: row.occurred_at.toISOString(),
		payload: row.payload,
	});
}

export async function ensureEventingSchema(pool: Queryable): Promise<void> {
	await pool.query(EVENTING_DDL);
}

export async function appendJournal(
	queryable: Queryable,
	envelope: DomainEventEnvelope,
): Promise<void> {
	const parsed = domainEventEnvelopeSchema.parse(envelope);
	await queryable.query(
		`INSERT INTO domain_journal (event_id, owner_domain, event_type, schema_version, occurred_at, payload)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb)
		 ON CONFLICT (event_id) DO NOTHING`,
		[
			parsed.eventId,
			parsed.ownerDomain,
			parsed.eventType,
			parsed.schemaVersion,
			parsed.occurredAt,
			JSON.stringify(parsed.payload),
		],
	);
}

export async function enqueueOutbox(
	queryable: Queryable,
	envelope: DomainEventEnvelope,
): Promise<void> {
	const parsed = domainEventEnvelopeSchema.parse(envelope);
	await queryable.query(
		`INSERT INTO outbox (event_id, owner_domain, event_type, schema_version, occurred_at, payload, status)
		 VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending')
		 ON CONFLICT (event_id) DO NOTHING`,
		[
			parsed.eventId,
			parsed.ownerDomain,
			parsed.eventType,
			parsed.schemaVersion,
			parsed.occurredAt,
			JSON.stringify(parsed.payload),
		],
	);
}

/** Atomic journal + outbox write in one transaction. */
export async function appendEventAtomic(
	pool: Pool,
	envelope: DomainEventEnvelope,
): Promise<void> {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await appendJournal(client, envelope);
		await enqueueOutbox(client, envelope);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export interface InboxConsumer {
	name: string;
	handle(envelope: DomainEventEnvelope): Promise<void>;
}

export async function markOutboxDispatched(
	queryable: Queryable,
	eventId: string,
): Promise<void> {
	await queryable.query(
		`UPDATE outbox SET status = 'published', dispatched_at = NOW(),
		 relay_claimed_by = NULL, relay_lease_expires_at = NULL
		 WHERE event_id = $1`,
		[eventId],
	);
}

/** Marks dispatched only when the relay still holds a valid lease (multi-relay fencing). */
export async function markOutboxDispatchedForRelay(
	queryable: Queryable,
	eventId: string,
	relayId: string,
): Promise<boolean> {
	const result = await queryable.query(
		`UPDATE outbox SET status = 'published', dispatched_at = NOW(),
		 relay_claimed_by = NULL, relay_lease_expires_at = NULL
		 WHERE event_id = $1 AND status = 'pending' AND relay_claimed_by = $2
		   AND relay_lease_expires_at IS NOT NULL AND relay_lease_expires_at >= NOW()
		 RETURNING event_id`,
		[eventId, relayId],
	);
	return (result.rowCount ?? 0) > 0;
}

export async function claimPendingOutboxForRelay(
	queryable: Queryable,
	relayId: string,
	leaseTtlMs: number,
	limit: number,
): Promise<DomainEventEnvelope[]> {
	const result = await queryable.query(
		`UPDATE outbox SET
			relay_claimed_by = $1,
			relay_lease_expires_at = NOW() + ($2::int * interval '1 millisecond')
		 WHERE event_id IN (
			SELECT event_id FROM outbox
			WHERE status = 'pending'
				AND (relay_lease_expires_at IS NULL OR relay_lease_expires_at < NOW())
			ORDER BY owner_domain ASC, occurred_at ASC
			LIMIT $3
			FOR UPDATE SKIP LOCKED
		 )
		 RETURNING event_id, owner_domain, event_type, schema_version, occurred_at, payload`,
		[relayId, leaseTtlMs, limit],
	);
	return result.rows.map((row) => rowToEnvelope(row));
}

export async function renewOutboxRelayLeases(
	queryable: Queryable,
	relayId: string,
	leaseTtlMs: number,
	eventIds: readonly string[],
): Promise<number> {
	if (eventIds.length === 0) {
		return 0;
	}
	const result = await queryable.query(
		`UPDATE outbox SET relay_lease_expires_at = NOW() + ($3::int * interval '1 millisecond')
		 WHERE relay_claimed_by = $1 AND event_id = ANY($2::text[]) AND status = 'pending'`,
		[relayId, eventIds, leaseTtlMs],
	);
	return result.rowCount ?? 0;
}

export async function releaseOutboxRelayClaims(
	queryable: Queryable,
	relayId: string,
	eventIds?: readonly string[],
): Promise<void> {
	if (eventIds && eventIds.length > 0) {
		await queryable.query(
			`UPDATE outbox SET relay_claimed_by = NULL, relay_lease_expires_at = NULL
			 WHERE relay_claimed_by = $1 AND event_id = ANY($2::text[])`,
			[relayId, eventIds],
		);
		return;
	}
	await queryable.query(
		`UPDATE outbox SET relay_claimed_by = NULL, relay_lease_expires_at = NULL
		 WHERE relay_claimed_by = $1`,
		[relayId],
	);
}

export async function fetchPendingOutbox(
	queryable: Queryable,
	limit = 50,
): Promise<DomainEventEnvelope[]> {
	const result = await queryable.query(
		`SELECT event_id, owner_domain, event_type, schema_version, occurred_at, payload
		 FROM outbox WHERE status = 'pending' ORDER BY occurred_at ASC LIMIT $1`,
		[limit],
	);
	return result.rows.map((row) => rowToEnvelope(row));
}

/** Idempotent consumer: skips if (eventId, consumer) already in inbox. */
export async function processWithInbox(
	pool: Pool,
	consumer: InboxConsumer,
	envelope: DomainEventEnvelope,
): Promise<"processed" | "skipped"> {
	const parsed = domainEventEnvelopeSchema.parse(envelope);
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		await client.query(
			"SELECT pg_advisory_xact_lock(hashtext($1::text), hashtext($2::text))",
			[parsed.eventId, consumer.name],
		);
		const existing = await client.query(
			"SELECT 1 FROM inbox WHERE event_id = $1 AND consumer_name = $2",
			[parsed.eventId, consumer.name],
		);
		if (existing.rowCount && existing.rowCount > 0) {
			await client.query("ROLLBACK");
			return "skipped";
		}
		await consumer.handle(parsed);
		const inserted = await client.query(
			`INSERT INTO inbox (event_id, consumer_name) VALUES ($1, $2)
			 ON CONFLICT (event_id, consumer_name) DO NOTHING
			 RETURNING event_id`,
			[parsed.eventId, consumer.name],
		);
		if (!inserted.rowCount || inserted.rowCount === 0) {
			await client.query("ROLLBACK");
			return "skipped";
		}
		await client.query("COMMIT");
		return "processed";
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export function createPgPool(databaseUrl: string): Pool {
	return new Pool({ connectionString: databaseUrl });
}
