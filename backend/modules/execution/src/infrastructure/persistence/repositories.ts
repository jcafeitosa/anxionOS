import type { PoolClient } from "pg";
import type {
  ExecutionFillRecord,
  ExecutionFillRepository,
  ExecutionOrderRecord,
  ExecutionOrderRepository,
  ExecutionSessionRecord,
  ExecutionSessionRepository,
  VenueAdapterRefRecord,
  VenueAdapterRefRepository,
} from "../../domain/ports/execution-unit-of-work";

function mapVenueAdapterRef(row: Record<string, unknown>): VenueAdapterRefRecord {
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
function mapOrder(row: Record<string, unknown>): ExecutionOrderRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        sessionId: String(row.session_id),
        clientOrderId: String(row.client_order_id),
        instrumentId: String(row.instrument_id),
        side: String(row.side),
        quantity: String(row.quantity),
        price: String(row.price),
        status: String(row.status),
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
export function createPgVenueAdapterRefRepository(client: PoolClient): VenueAdapterRefRepository {
    return {
        async findSimulatedByOrganization(organizationId) {
            const result = await client.query(`SELECT * FROM execution_venue_adapter_refs
				 WHERE organization_id = $1 AND adapter_kind = 'SIMULATED' LIMIT 1`, [organizationId]);
            const row = result.rows[0];
            return row ? mapVenueAdapterRef(row) : null;
        },
        async save(record: VenueAdapterRefRecord) {
            await client.query(`INSERT INTO execution_venue_adapter_refs (id, organization_id, adapter_kind, status)
				 VALUES ($1,$2,$3,$4)
				 ON CONFLICT (organization_id, adapter_kind) DO NOTHING`, [record.id, record.organizationId, record.adapterKind, record.status]);
            return record;
        },
    };
}
export function createPgExecutionSessionRepository(client: PoolClient): ExecutionSessionRepository {
    return {
        async findById(id) {
            const result = await client.query(`SELECT * FROM execution_sessions WHERE id = $1`, [id]);
            const row = result.rows[0];
            return row ? mapSession(row) : null;
        },
        async save(record: ExecutionSessionRecord) {
            await client.query(`INSERT INTO execution_sessions (
				   id, organization_id, status, intent_hash, risk_permit_id,
				   authority_epoch, risk_epoch, execution_mode, venue_adapter_ref_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
                record.id,
                record.organizationId,
                record.status,
                record.intentHash,
                record.riskPermitId,
                record.authorityEpoch,
                record.riskEpoch,
                record.executionMode,
                record.venueAdapterRefId,
            ]);
            return record;
        },
    };
}
export function createPgExecutionOrderRepository(client: PoolClient): ExecutionOrderRepository {
    return {
        async findByClientOrderId(organizationId, clientOrderId) {
            const result = await client.query(`SELECT * FROM execution_orders WHERE organization_id = $1 AND client_order_id = $2`, [organizationId, clientOrderId]);
            const row = result.rows[0];
            return row ? mapOrder(row) : null;
        },
        async save(record: ExecutionOrderRecord) {
            await client.query(`INSERT INTO execution_orders (
				   id, organization_id, session_id, client_order_id, instrument_id, side, quantity, price, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
                record.id,
                record.organizationId,
                record.sessionId,
                record.clientOrderId,
                record.instrumentId,
                record.side,
                record.quantity,
                record.price,
                record.status,
            ]);
            return record;
        },
    };
}
export function createPgExecutionFillRepository(client: PoolClient): ExecutionFillRepository {
    return {
        async findByVenueFillId(venueFillId) {
            const result = await client.query(`SELECT * FROM execution_fills WHERE venue_fill_id = $1`, [venueFillId]);
            const row = result.rows[0];
            return row ? mapFill(row) : null;
        },
        async save(record: ExecutionFillRecord) {
            await client.query(`INSERT INTO execution_fills (
				   id, organization_id, order_id, venue_fill_id, quantity, price,
				   notional_amount, asset, status, filled_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
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
            ]);
            return record;
        },
    };
}
