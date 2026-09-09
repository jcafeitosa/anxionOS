import type { Pool, PoolClient } from "pg";
import type { ProjectionInbox, ProjectionInboxClaimInput, ProjectionInboxClaimResult, ProjectionInboxEntry } from "../../domain/ports/projection-inbox";

function rowToEntry(row) {
    return {
        eventId: row.event_id,
        consumerName: row.consumer_name,
        ownerDomain: row.owner_domain,
        status: row.status,
        checkpoint: Number(row.checkpoint),
        projectionGeneration: Number(row.projection_generation),
        attemptCount: row.attempt_count,
    };
}
export async function findInboxEntry(queryable, eventId, consumerName) {
    const result = await queryable.query(`SELECT event_id, consumer_name, owner_domain, status, checkpoint,
		        projection_generation, attempt_count
		   FROM graph_projection_inbox
		  WHERE event_id = $1 AND consumer_name = $2`, [eventId, consumerName]);
    const row = result.rows[0];
    return row ? rowToEntry(row) : null;
}
export async function claimInboxForProcessing(client, input) {
    await client.query(`INSERT INTO graph_projection_inbox (
		   event_id, consumer_name, owner_domain, status, checkpoint,
		   projection_generation, attempt_count
		 ) VALUES ($1, $2, $3, 'pending', $4, $5, 0)
		 ON CONFLICT (event_id, consumer_name) DO NOTHING`, [
        input.eventId,
        input.consumerName,
        input.ownerDomain,
        input.checkpoint,
        input.projectionGeneration,
    ]);
    const existing = await client.query(`SELECT event_id, consumer_name, owner_domain, status, checkpoint,
		        projection_generation, attempt_count
		   FROM graph_projection_inbox
		  WHERE event_id = $1 AND consumer_name = $2
		  FOR UPDATE`, [input.eventId, input.consumerName]);
    const row = existing.rows[0];
    if (!row) {
        throw new Error("Inbox claim failed to load row after insert");
    }
    if (row.status === "acked") {
        return "already_processed";
    }
    if (row.status === "quarantined") {
        return rowToEntry(row);
    }
    const claimed = await client.query(`UPDATE graph_projection_inbox
		    SET status = 'processing',
		        attempt_count = attempt_count + 1,
		        owner_domain = $3,
		        checkpoint = $4
		  WHERE event_id = $1 AND consumer_name = $2
		  RETURNING event_id, consumer_name, owner_domain, status, checkpoint,
		            projection_generation, attempt_count`, [input.eventId, input.consumerName, input.ownerDomain, input.checkpoint]);
    const claimedRow = claimed.rows[0];
    if (!claimedRow) {
        throw new Error("Inbox claim update returned no row");
    }
    return rowToEntry(claimedRow);
}
export async function ackInboxEntry(client, eventId, consumerName, checkpoint, projectionGeneration) {
    await client.query(`UPDATE graph_projection_inbox
		    SET status = 'acked',
		        checkpoint = $3,
		        projection_generation = $4,
		        processed_at = NOW(),
		        error_code = NULL
		  WHERE event_id = $1 AND consumer_name = $2`, [eventId, consumerName, checkpoint, projectionGeneration]);
}
export async function markInboxPendingRetry(client, eventId, consumerName, errorCode) {
    await client.query(`UPDATE graph_projection_inbox
		    SET status = 'pending',
		        error_code = $3
		  WHERE event_id = $1 AND consumer_name = $2`, [eventId, consumerName, errorCode]);
}
export async function quarantineInboxEntry(client, eventId, consumerName, errorCode) {
    const result = await client.query(`UPDATE graph_projection_inbox
		    SET status = 'quarantined',
		        error_code = $3,
		        processed_at = NOW()
		  WHERE event_id = $1 AND consumer_name = $2
		  RETURNING event_id, consumer_name, owner_domain, status, checkpoint,
		            projection_generation, attempt_count`, [eventId, consumerName, errorCode]);
    const row = result.rows[0];
    if (!row) {
        throw new Error("Inbox quarantine update returned no row");
    }
    return rowToEntry(row);
}
export async function bumpProjectionGeneration(client, consumerName) {
    const result = await client.query(`INSERT INTO graph_projection_generation (consumer_name, generation, updated_at)
		 VALUES ($1, 1, NOW())
		 ON CONFLICT (consumer_name)
		 DO UPDATE SET generation = graph_projection_generation.generation + 1,
		               updated_at = NOW()
		 RETURNING generation`, [consumerName]);
    return Number(result.rows[0]?.generation ?? 0);
}
export function createPgProjectionInbox(pool: Pool): ProjectionInbox {
    return {
        async find(eventId, consumerName) {
            return findInboxEntry(pool, eventId, consumerName);
        },
        async tryClaim(input) {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                const claim = await claimInboxForProcessing(client, input);
                await client.query("COMMIT");
                return claim;
            }
            catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
            finally {
                client.release();
            }
        },
        async ack(eventId, consumerName, checkpoint) {
            const entry = await findInboxEntry(pool, eventId, consumerName);
            const generation = entry?.projectionGeneration ?? 0;
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                await ackInboxEntry(client, eventId, consumerName, checkpoint, generation);
                await client.query("COMMIT");
            }
            catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
            finally {
                client.release();
            }
        },
        async quarantine(eventId, consumerName, errorCode) {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                await quarantineInboxEntry(client, eventId, consumerName, errorCode);
                await client.query("COMMIT");
            }
            catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
            finally {
                client.release();
            }
        },
    };
}
export async function findProjectionGeneration(queryable, consumerName) {
    const result = await queryable.query(`SELECT generation FROM graph_projection_generation WHERE consumer_name = $1`, [consumerName]);
    if (!result.rows[0]) {
        return 0;
    }
    return Number(result.rows[0].generation);
}
