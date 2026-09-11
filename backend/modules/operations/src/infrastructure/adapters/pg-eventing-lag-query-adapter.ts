import type { Pool, PoolClient, QueryResultRow } from "pg";
import type {
	EventingLagQueryPort,
	EventingLagSample,
} from "../../domain/ports/eventing-lag-query";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

interface OutboxLagRow extends QueryResultRow {
	owner_domain: string;
	oldest_pending_at: Date | string;
	pending_count: string | number;
}

function rowToOutboxSample(row: OutboxLagRow): EventingLagSample {
	return {
		channel: "outbox",
		ownerDomain: row.owner_domain,
		oldestPendingAt:
			row.oldest_pending_at instanceof Date
				? row.oldest_pending_at.toISOString()
				: String(row.oldest_pending_at),
		pendingCount: Number(row.pending_count),
	};
}

export function createPgEventingLagQueryAdapter(
	queryable: Queryable,
): EventingLagQueryPort {
	return {
		async getOutboxLagSamples(): Promise<EventingLagSample[]> {
			const result = await queryable.query<OutboxLagRow>(
				`SELECT owner_domain,
				        MIN(occurred_at) AS oldest_pending_at,
				        COUNT(*)::int AS pending_count
				 FROM outbox
				 WHERE status = 'pending'
				 GROUP BY owner_domain
				 ORDER BY owner_domain`,
			);
			return result.rows.map(rowToOutboxSample);
		},
		async getInboxLagSamples(): Promise<EventingLagSample[]> {
			// Inbox table records processed events only; pending backlog is not persisted here.
			return [];
		},
	};
}
