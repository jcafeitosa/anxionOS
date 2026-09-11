import type { PoolClient } from "pg";
import type {
	DecisionsConsumerDedupRecord,
	DecisionsConsumerDedupRepository,
} from "../../domain/ports/consumer-dedup";

export function createPgDecisionsConsumerDedupRepository(
	client: PoolClient,
): DecisionsConsumerDedupRepository {
	return {
		async findByEventId(eventId) {
			const result = await client.query(
				"SELECT * FROM decisions_consumer_dedup WHERE event_id = $1",
				[eventId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				eventId: String(row.event_id),
				consumerName: String(row.consumer_name),
				organizationId: String(row.organization_id),
			};
		},
		async save(record) {
			await client.query(
				`INSERT INTO decisions_consumer_dedup (event_id, consumer_name, organization_id)
				 VALUES ($1, $2, $3)`,
				[record.eventId, record.consumerName, record.organizationId],
			);
			return record;
		},
	};
}
