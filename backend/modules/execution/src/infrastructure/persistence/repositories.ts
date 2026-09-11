import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;
import type {
	ExecutionFillRecord,
	ExecutionFillRepository,
	ExecutionOrderAttemptRecord,
	ExecutionOrderAttemptRepository,
	ExecutionOrderRecord,
	ExecutionOrderRepository,
	ExecutionReconciliationCaseRecord,
	ExecutionReconciliationCaseRepository,
	ExecutionSessionRecord,
	ExecutionSessionRepository,
	VenueAdapterRefRecord,
	VenueAdapterRefRepository,
} from "../../domain/ports/execution-unit-of-work";

function mapVenueAdapterRef(
	row: Record<string, unknown>,
): VenueAdapterRefRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		adapterKind: String(row.adapter_kind),
		status: String(row.status),
	};
}
function mapSession(row: Record<string, unknown>): ExecutionSessionRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		status: String(row.status),
		intentHash: String(row.intent_hash),
		riskPermitId: String(row.risk_permit_id),
		authorityEpoch: Number(row.authority_epoch),
		riskEpoch: Number(row.risk_epoch),
		executionMode: String(row.execution_mode),
		venueAdapterRefId: String(row.venue_adapter_ref_id),
	};
}
function normalizeDecimalColumn(value: unknown): string {
	const raw = String(value ?? "0");
	const parsed = Number.parseFloat(raw);
	if (Number.isNaN(parsed)) return raw;
	const fixed = parsed.toFixed(8);
	return fixed.replace(/\.?0+$/, "") || "0";
}

function mapOrder(row: Record<string, unknown>): ExecutionOrderRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		sessionId: String(row.session_id),
		clientOrderId: String(row.client_order_id),
		instrumentId: String(row.instrument_id),
		side: String(row.side),
		quantity: normalizeDecimalColumn(row.quantity),
		price: normalizeDecimalColumn(row.price),
		filledQuantity: normalizeDecimalColumn(row.filled_quantity),
		status: String(row.status),
		venueDispatchStatus:
			row.venue_dispatch_status == null
				? null
				: String(row.venue_dispatch_status),
	};
}
function mapOrderAttempt(
	row: Record<string, unknown>,
): ExecutionOrderAttemptRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		orderId: String(row.order_id),
		attemptNo: Number(row.attempt_no),
		adapterKind: String(row.adapter_kind),
		requestHash: String(row.request_hash),
		status: String(row.status),
		responseCode:
			row.response_code == null ? null : String(row.response_code),
		errorCode: row.error_code == null ? null : String(row.error_code),
		sentAt: new Date(String(row.sent_at)).toISOString(),
	};
}
function mapReconciliationCase(
	row: Record<string, unknown>,
): ExecutionReconciliationCaseRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		caseKind: String(row.case_kind),
		status: String(row.status),
		orderId: row.order_id == null ? null : String(row.order_id),
		fillId: row.fill_id == null ? null : String(row.fill_id),
		venueAdapterRefId: String(row.venue_adapter_ref_id),
		venueFillId:
			row.venue_fill_id == null ? null : String(row.venue_fill_id),
		evidence: row.evidence == null ? null : String(row.evidence),
		disposition: row.disposition == null ? null : String(row.disposition),
		dispositionRationale:
			row.disposition_rationale == null
				? null
				: String(row.disposition_rationale),
		openedAt: new Date(String(row.opened_at)).toISOString(),
		resolvedAt:
			row.resolved_at == null
				? null
				: new Date(String(row.resolved_at)).toISOString(),
	};
}
function mapFill(row: Record<string, unknown>): ExecutionFillRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		orderId: String(row.order_id),
		venueFillId: String(row.venue_fill_id),
		quantity: String(row.quantity),
		price: String(row.price),
		notionalAmount: String(row.notional_amount),
		asset: String(row.asset),
		status: String(row.status),
		filledAt: new Date(String(row.filled_at)).toISOString(),
	};
}
export function createPgVenueAdapterRefRepository(
	client: PoolClient,
): VenueAdapterRefRepository {
	return {
		async findSimulatedByOrganization(organizationId) {
			const result = await client.query(
				`SELECT * FROM execution_venue_adapter_refs
				 WHERE organization_id = $1 AND adapter_kind = 'SIMULATED' LIMIT 1`,
				[organizationId],
			);
			const row = result.rows[0];
			return row ? mapVenueAdapterRef(row) : null;
		},
		async save(record: VenueAdapterRefRecord) {
			await client.query(
				`INSERT INTO execution_venue_adapter_refs (id, organization_id, adapter_kind, status)
				 VALUES ($1,$2,$3,$4)
				 ON CONFLICT (organization_id, adapter_kind) DO NOTHING`,
				[record.id, record.organizationId, record.adapterKind, record.status],
			);
			return record;
		},
	};
}
export function createPgExecutionSessionRepository(
	client: PoolClient,
): ExecutionSessionRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM execution_sessions WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapSession(row) : null;
		},
		async save(record: ExecutionSessionRecord) {
			await client.query(
				`INSERT INTO execution_sessions (
				   id, organization_id, status, intent_hash, risk_permit_id,
				   authority_epoch, risk_epoch, execution_mode, venue_adapter_ref_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.status,
					record.intentHash,
					record.riskPermitId,
					record.authorityEpoch,
					record.riskEpoch,
					record.executionMode,
					record.venueAdapterRefId,
				],
			);
			return record;
		},
	};
}
export function createPgExecutionOrderRepository(
	client: PgQueryable,
): ExecutionOrderRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM execution_orders WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapOrder(row) : null;
		},
		async findByIdForUpdate(id) {
			const result = await client.query(
				"SELECT * FROM execution_orders WHERE id = $1 FOR UPDATE",
				[id],
			);
			const row = result.rows[0];
			return row ? mapOrder(row) : null;
		},
		async findByClientOrderId(organizationId, clientOrderId) {
			const result = await client.query(
				"SELECT * FROM execution_orders WHERE organization_id = $1 AND client_order_id = $2",
				[organizationId, clientOrderId],
			);
			const row = result.rows[0];
			return row ? mapOrder(row) : null;
		},
		async listOpenByOrganizationId(organizationId, limit = 50) {
			const result = await client.query(
				`SELECT o.*, s.execution_mode, o.created_at AS submitted_at
				 FROM execution_orders o
				 JOIN execution_sessions s ON s.id = o.session_id
				 WHERE o.organization_id = $1
				   AND o.status IN ('SUBMITTED', 'PARTIALLY_FILLED')
				 ORDER BY o.created_at DESC
				 LIMIT $2`,
				[organizationId, limit],
			);
			return result.rows.map((row) => ({
				...mapOrder(row),
				executionMode: String(row.execution_mode),
				submittedAt: new Date(String(row.submitted_at)).toISOString(),
			}));
		},
		async save(record: ExecutionOrderRecord) {
			await client.query(
				`INSERT INTO execution_orders (
				   id, organization_id, session_id, client_order_id, instrument_id, side,
				   quantity, price, filled_quantity, status, venue_dispatch_status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
				[
					record.id,
					record.organizationId,
					record.sessionId,
					record.clientOrderId,
					record.instrumentId,
					record.side,
					record.quantity,
					record.price,
					record.filledQuantity,
					record.status,
					record.venueDispatchStatus ?? null,
				],
			);
			return record;
		},
		async update(record: ExecutionOrderRecord) {
			await client.query(
				`UPDATE execution_orders
				 SET status = $2,
				     filled_quantity = $3,
				     venue_dispatch_status = $4
				 WHERE id = $1`,
				[
					record.id,
					record.status,
					record.filledQuantity,
					record.venueDispatchStatus ?? null,
				],
			);
			return record;
		},
	};
}
export function createPgExecutionFillRepository(
	client: PoolClient,
): ExecutionFillRepository {
	return {
		async findByVenueFillId(venueFillId) {
			const result = await client.query(
				"SELECT * FROM execution_fills WHERE venue_fill_id = $1",
				[venueFillId],
			);
			const row = result.rows[0];
			return row ? mapFill(row) : null;
		},
		async findByOrderId(orderId) {
			const result = await client.query(
				"SELECT * FROM execution_fills WHERE order_id = $1 ORDER BY filled_at",
				[orderId],
			);
			return result.rows.map((row) => mapFill(row));
		},
		async save(record: ExecutionFillRecord) {
			await client.query(
				`INSERT INTO execution_fills (
				   id, organization_id, order_id, venue_fill_id, quantity, price,
				   notional_amount, asset, status, filled_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.orderId,
					record.venueFillId,
					record.quantity,
					record.price,
					record.notionalAmount,
					record.asset,
					record.status,
					record.filledAt,
				],
			);
			return record;
		},
	};
}
export function createPgExecutionOrderAttemptRepository(
	client: PoolClient,
): ExecutionOrderAttemptRepository {
	return {
		async findLatestByOrderId(orderId) {
			const result = await client.query(
				`SELECT * FROM execution_order_attempts
				 WHERE order_id = $1
				 ORDER BY attempt_no DESC
				 LIMIT 1`,
				[orderId],
			);
			const row = result.rows[0];
			return row ? mapOrderAttempt(row) : null;
		},
		async countByOrderId(orderId) {
			const result = await client.query(
				`SELECT count(*)::int AS c FROM execution_order_attempts WHERE order_id = $1`,
				[orderId],
			);
			return Number(result.rows[0]?.c ?? 0);
		},
		async save(record: ExecutionOrderAttemptRecord) {
			await client.query(
				`INSERT INTO execution_order_attempts (
				   id, organization_id, order_id, attempt_no, adapter_kind, request_hash,
				   status, response_code, error_code, sent_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.orderId,
					record.attemptNo,
					record.adapterKind,
					record.requestHash,
					record.status,
					record.responseCode ?? null,
					record.errorCode ?? null,
					record.sentAt,
				],
			);
			return record;
		},
	};
}
export function createPgExecutionReconciliationCaseRepository(
	client: PgQueryable,
): ExecutionReconciliationCaseRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM execution_reconciliation_cases WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapReconciliationCase(row) : null;
		},
		async findOpenByVenueFillId(organizationId, venueFillId) {
			const result = await client.query(
				`SELECT * FROM execution_reconciliation_cases
				 WHERE organization_id = $1
				   AND venue_fill_id = $2
				   AND status IN ('OPEN', 'INVESTIGATING')
				 ORDER BY opened_at DESC
				 LIMIT 1`,
				[organizationId, venueFillId],
			);
			const row = result.rows[0];
			return row ? mapReconciliationCase(row) : null;
		},
		async listByOrganizationId(organizationId, limit = 50) {
			const result = await client.query(
				`SELECT * FROM execution_reconciliation_cases
				 WHERE organization_id = $1
				 ORDER BY opened_at DESC
				 LIMIT $2`,
				[organizationId, limit],
			);
			return result.rows.map((row) => mapReconciliationCase(row));
		},
		async save(record: ExecutionReconciliationCaseRecord) {
			await client.query(
				`INSERT INTO execution_reconciliation_cases (
				   id, organization_id, case_kind, status, order_id, fill_id,
				   venue_adapter_ref_id, venue_fill_id, evidence, disposition,
				   disposition_rationale, opened_at, resolved_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
				[
					record.id,
					record.organizationId,
					record.caseKind,
					record.status,
					record.orderId ?? null,
					record.fillId ?? null,
					record.venueAdapterRefId,
					record.venueFillId ?? null,
					record.evidence ?? null,
					record.disposition ?? null,
					record.dispositionRationale ?? null,
					record.openedAt,
					record.resolvedAt ?? null,
				],
			);
			return record;
		},
		async update(record: ExecutionReconciliationCaseRecord) {
			await client.query(
				`UPDATE execution_reconciliation_cases
				 SET status = $2,
				     disposition = $3,
				     disposition_rationale = $4,
				     resolved_at = $5
				 WHERE id = $1`,
				[
					record.id,
					record.status,
					record.disposition ?? null,
					record.dispositionRationale ?? null,
					record.resolvedAt ?? null,
				],
			);
			return record;
		},
	};
}
