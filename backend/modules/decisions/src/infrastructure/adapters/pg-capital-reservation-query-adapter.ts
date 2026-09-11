import type { Pool } from "pg";
import type {
	CapitalReservationQueryPort,
	HeldCapitalReservation,
} from "../../domain/ports/capital-reservation-query-port";

export function createPgCapitalReservationQueryAdapter(
	pool: Pool,
): CapitalReservationQueryPort {
	return {
		async findHeldByIntentHash(organizationId, intentHash) {
			const result = await pool.query(
				`SELECT id, organization_id, intent_hash
				 FROM capital_reservations
				 WHERE organization_id = $1
				   AND intent_hash = $2
				   AND status = 'HELD'
				 LIMIT 1`,
				[organizationId, intentHash],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				reservationId: String(row.id),
				organizationId: String(row.organization_id),
				intentHash: String(row.intent_hash),
			} satisfies HeldCapitalReservation;
		},
	};
}
