import type { PoolClient } from "pg";
import { DecisionsCommandError } from "../../application/errors";
import type {
	SubmitPreconditionsRecord,
	SubmitPreconditionsRepository,
} from "../../domain/ports/submit-preconditions";

function mapRow(row: Record<string, unknown>): SubmitPreconditionsRecord {
	return {
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		intentHash: String(row.intent_hash),
		riskCheckId: row.risk_check_id ? String(row.risk_check_id) : undefined,
		riskCheckResult: row.risk_check_result
			? String(row.risk_check_result)
			: undefined,
		capitalReservationId: row.capital_reservation_id
			? String(row.capital_reservation_id)
			: undefined,
		riskEventId: row.risk_event_id ? String(row.risk_event_id) : undefined,
		capitalEventId: row.capital_event_id
			? String(row.capital_event_id)
			: undefined,
	};
}

export function createPgSubmitPreconditionsRepository(
	client: PoolClient,
): SubmitPreconditionsRepository {
	return {
		async findByDecisionId(decisionId) {
			const result = await client.query(
				"SELECT * FROM decisions_submit_preconditions WHERE decision_id = $1",
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapRow(row) : null;
		},
		async findByOrganizationAndIntentHash(organizationId, intentHash) {
			const result = await client.query(
				`SELECT * FROM decisions_submit_preconditions
				 WHERE organization_id = $1 AND intent_hash = $2`,
				[organizationId, intentHash],
			);
			const row = result.rows[0];
			return row ? mapRow(row) : null;
		},
		async findByRiskEventId(eventId) {
			const result = await client.query(
				"SELECT * FROM decisions_submit_preconditions WHERE risk_event_id = $1",
				[eventId],
			);
			const row = result.rows[0];
			return row ? mapRow(row) : null;
		},
		async findByCapitalEventId(eventId) {
			const result = await client.query(
				"SELECT * FROM decisions_submit_preconditions WHERE capital_event_id = $1",
				[eventId],
			);
			const row = result.rows[0];
			return row ? mapRow(row) : null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO decisions_submit_preconditions (
				   decision_id, organization_id, intent_hash
				 ) VALUES ($1, $2, $3)`,
				[record.decisionId, record.organizationId, record.intentHash],
			);
			return record;
		},
		async updateRiskCheck(decisionId, input) {
			const result = await client.query(
				`UPDATE decisions_submit_preconditions
				 SET risk_check_id = $2,
				     risk_check_result = $3,
				     risk_event_id = $4,
				     updated_at = NOW()
				 WHERE decision_id = $1
				 RETURNING *`,
				[
					decisionId,
					input.riskCheckId,
					input.riskCheckResult,
					input.riskEventId,
				],
			);
			const row = result.rows[0];
			if (!row) {
				throw new DecisionsCommandError(
					"DC_SUBMIT_PRECONDITION",
					"submit preconditions not found for risk update",
				);
			}
			return mapRow(row);
		},
		async updateCapitalReservation(decisionId, input) {
			const result = await client.query(
				`UPDATE decisions_submit_preconditions
				 SET capital_reservation_id = $2,
				     capital_event_id = $3,
				     updated_at = NOW()
				 WHERE decision_id = $1
				 RETURNING *`,
				[decisionId, input.capitalReservationId, input.capitalEventId],
			);
			const row = result.rows[0];
			if (!row) {
				throw new DecisionsCommandError(
					"DC_SUBMIT_PRECONDITION",
					"submit preconditions not found for capital update",
				);
			}
			return mapRow(row);
		},
		async invalidateRiskPassForOrganization(organizationId) {
			const result = await client.query(
				`UPDATE decisions_submit_preconditions
				 SET risk_check_id = NULL,
				     risk_check_result = NULL,
				     risk_event_id = NULL,
				     updated_at = NOW()
				 WHERE organization_id = $1
				   AND risk_check_result = 'PASS'
				 RETURNING decision_id`,
				[organizationId],
			);
			return result.rows.map((row) => String(row.decision_id));
		},
	};
}
