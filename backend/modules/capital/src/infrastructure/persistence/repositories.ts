import type { PoolClient } from "pg";
import type { AllocationRepository, BalanceLineRepository, CapitalAccountRepository, ReservationRepository } from "../../domain/ports/capital-unit-of-work";

function mapAccount(row) {
    return {
        id: row.id,
        organizationId: row.organization_id,
        ownerUserId: row.owner_user_id,
        baseCurrency: row.base_currency,
        executionMode: row.execution_mode,
        status: row.status,
        revision: row.revision,
    };
}
function mapBalanceLine(row) {
    return {
        accountId: row.account_id,
        asset: row.asset,
        settled: String(row.settled),
        encumbered: String(row.encumbered),
        reserved: String(row.reserved),
        revision: row.revision,
    };
}
function mapReservation(row) {
    return {
        id: row.id,
        accountId: row.account_id,
        organizationId: row.organization_id,
        portfolioId: row.portfolio_id,
        grantId: row.grant_id,
        intentHash: row.intent_hash,
        asset: row.asset,
        amount: String(row.amount),
        reservationKind: row.reservation_kind,
        status: row.status,
        expiresAt: row.expires_at ? String(row.expires_at) : null,
    };
}
export function createPgCapitalAccountRepository(client: PoolClient): CapitalAccountRepository {
    return {
        async findById(accountId, organizationId) {
            const result = await client.query(`SELECT * FROM capital_accounts WHERE id = $1 AND organization_id = $2`, [accountId, organizationId]);
            const row = result.rows[0];
            return row ? mapAccount(row) : null;
        },
        async findActiveByNaturalKey(organizationId, ownerUserId) {
            const result = await client.query(`SELECT * FROM capital_accounts WHERE organization_id = $1 AND owner_user_id = $2 AND status = 'ACTIVE'`, [organizationId, ownerUserId]);
            const row = result.rows[0];
            return row ? mapAccount(row) : null;
        },
        async save(record) {
            await client.query(`INSERT INTO capital_accounts (id, organization_id, owner_user_id, base_currency, execution_mode, status, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
                record.id,
                record.organizationId,
                record.ownerUserId,
                record.baseCurrency,
                record.executionMode,
                record.status,
                record.revision,
            ]);
            return record;
        },
    };
}
export function createPgBalanceLineRepository(client: PoolClient): BalanceLineRepository {
    return {
        async acquireAccountLock(accountId) {
            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [accountId]);
        },
        async lockForUpdate(accountId, asset) {
            const result = await client.query(`SELECT * FROM capital_balance_lines WHERE account_id = $1 AND asset = $2 FOR UPDATE`, [accountId, asset]);
            const row = result.rows[0];
            return row ? mapBalanceLine(row) : null;
        },
        async save(record) {
            await client.query(`INSERT INTO capital_balance_lines (account_id, asset, settled, encumbered, reserved, revision)
				 VALUES ($1,$2,$3,$4,$5,$6)
				 ON CONFLICT (account_id, asset) DO UPDATE SET
				   settled = EXCLUDED.settled,
				   revision = capital_balance_lines.revision + 1,
				   as_of = now()`, [
                record.accountId,
                record.asset,
                record.settled,
                record.encumbered,
                record.reserved,
                record.revision,
            ]);
            return record;
        },
        async assertAvailableForReservation(accountId, asset, amount) {
            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [accountId]);
            const locked = await client.query(`SELECT * FROM capital_balance_lines WHERE account_id = $1 AND asset = $2 FOR UPDATE`, [accountId, asset]);
            const row = locked.rows[0];
            if (!row) {
                throw new Error("CAP_INSUFFICIENT_AVAILABLE:missing_balance_line");
            }
            const check = await client.query(`SELECT (
				   (SELECT settled FROM capital_balance_lines WHERE account_id = $1 AND asset = $2)
				   - COALESCE((SELECT SUM(amount) FROM capital_reservations WHERE account_id = $1 AND asset = $2 AND status = 'HELD'), 0)
				 ) >= $3::numeric AS ok`, [accountId, asset, amount]);
            if (!check.rows[0]?.ok) {
                throw new Error("CAP_INSUFFICIENT_AVAILABLE:exceeds_available");
            }
            return mapBalanceLine(row);
        },
        async sumHeldReservations(accountId, asset) {
            const result = await client.query(`SELECT COALESCE(SUM(amount), 0)::text AS total
				 FROM capital_reservations
				 WHERE account_id = $1 AND asset = $2 AND status = 'HELD'`, [accountId, asset]);
            return result.rows[0].total;
        },
    };
}
export function createPgAllocationRepository(client: PoolClient): AllocationRepository {
    return {
        async save(record) {
            await client.query(`INSERT INTO capital_allocations (id, account_id, organization_id, portfolio_id, grant_id, state, limit_amount, limit_currency, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [
                record.id,
                record.accountId,
                record.organizationId,
                record.portfolioId,
                record.grantId,
                record.state,
                record.limitAmount,
                record.limitCurrency,
                record.revision,
            ]);
            return record;
        },
    };
}
export function createPgReservationRepository(client: PoolClient): ReservationRepository {
    return {
        async findActiveByIntent(accountId, intentHash) {
            const result = await client.query(`SELECT * FROM capital_reservations WHERE account_id = $1 AND intent_hash = $2 AND status = 'HELD'`, [accountId, intentHash]);
            const row = result.rows[0];
            return row ? mapReservation(row) : null;
        },
        async save(record) {
            await client.query(`INSERT INTO capital_reservations (id, account_id, organization_id, portfolio_id, grant_id, intent_hash, asset, amount, reservation_kind, status, expires_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                record.id,
                record.accountId,
                record.organizationId,
                record.portfolioId,
                record.grantId,
                record.intentHash,
                record.asset,
                record.amount,
                record.reservationKind,
                record.status,
                record.expiresAt,
            ]);
            return record;
        },
    };
}
