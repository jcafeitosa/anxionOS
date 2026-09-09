import type { PoolClient } from "pg";
import type {
  CheckResultRecord,
  CheckResultRepository,
  EpochRegistryRecord,
  EpochRegistryRepository,
  LimitPolicyRecord,
  LimitPolicyRepository,
  PermitRecord,
  PermitRepository,
} from "../../domain/ports/risk-unit-of-work";

function mapPolicy(row: Record<string, unknown>): LimitPolicyRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        policyVersion: String(row.policy_version),
        maxNotional: String(row.max_notional),
        maxLeverage: row.max_leverage != null ? String(row.max_leverage) : null,
        riskEpoch: Number(row.risk_epoch),
        status: String(row.status),
    };
}
function mapEpoch(row: Record<string, unknown>): EpochRegistryRecord {
    return {
        organizationId: String(row.organization_id),
        currentRiskEpoch: Number(row.current_risk_epoch),
    };
}
function mapCheck(row: Record<string, unknown>): CheckResultRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        portfolioId: String(row.portfolio_id),
        intentHash: String(row.intent_hash),
        notionalAmount: String(row.notional_amount),
        authorityEpoch: Number(row.authority_epoch),
        riskEpoch: Number(row.risk_epoch),
        executionMode: String(row.execution_mode),
        checkResult: String(row.check_result),
        denyReasonCode: row.deny_reason_code != null ? String(row.deny_reason_code) : null,
    };
}
function mapPermit(row: Record<string, unknown>): PermitRecord {
    return {
        id: String(row.id),
        organizationId: String(row.organization_id),
        checkId: String(row.check_id),
        intentHash: String(row.intent_hash),
        authorityEpoch: Number(row.authority_epoch),
        riskEpoch: Number(row.risk_epoch),
        status: String(row.status),
    };
}
export function createPgLimitPolicyRepository(client: PoolClient): LimitPolicyRepository {
    return {
        async findActiveByOrganization(organizationId) {
            const result = await client.query(`SELECT * FROM risk_limit_policies
				 WHERE organization_id = $1 AND status = 'ACTIVE'
				 ORDER BY created_at DESC LIMIT 1`, [organizationId]);
            const row = result.rows[0];
            return row ? mapPolicy(row) : null;
        },
        async save(record: LimitPolicyRecord) {
            await client.query(`INSERT INTO risk_limit_policies (
				   id, organization_id, policy_version, max_notional, max_leverage, risk_epoch, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
                record.id,
                record.organizationId,
                record.policyVersion,
                record.maxNotional,
                record.maxLeverage,
                record.riskEpoch,
                record.status,
            ]);
            return record;
        },
        async supersedeActive(organizationId) {
            await client.query(`UPDATE risk_limit_policies SET status = 'SUPERSEDED'
				 WHERE organization_id = $1 AND status = 'ACTIVE'`, [organizationId]);
        },
    };
}
export function createPgEpochRegistryRepository(client: PoolClient): EpochRegistryRepository {
    return {
        async findByOrganization(organizationId) {
            const result = await client.query(`SELECT * FROM risk_epoch_registry WHERE organization_id = $1`, [organizationId]);
            const row = result.rows[0];
            return row ? mapEpoch(row) : null;
        },
        async upsert(record: EpochRegistryRecord) {
            await client.query(`INSERT INTO risk_epoch_registry (organization_id, current_risk_epoch, updated_at)
				 VALUES ($1, $2, now())
				 ON CONFLICT (organization_id)
				 DO UPDATE SET current_risk_epoch = EXCLUDED.current_risk_epoch, updated_at = now()`, [record.organizationId, record.currentRiskEpoch]);
            return record;
        },
    };
}
export function createPgCheckResultRepository(client: PoolClient): CheckResultRepository {
    return {
        async findByIntentHash(organizationId, intentHash) {
            const result = await client.query(`SELECT * FROM risk_check_results WHERE organization_id = $1 AND intent_hash = $2`, [organizationId, intentHash]);
            const row = result.rows[0];
            return row ? mapCheck(row) : null;
        },
        async save(record: CheckResultRecord) {
            await client.query(`INSERT INTO risk_check_results (
				   id, organization_id, portfolio_id, intent_hash, notional_amount,
				   authority_epoch, risk_epoch, execution_mode, check_result, deny_reason_code
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
                record.id,
                record.organizationId,
                record.portfolioId,
                record.intentHash,
                record.notionalAmount,
                record.authorityEpoch,
                record.riskEpoch,
                record.executionMode,
                record.checkResult,
                record.denyReasonCode,
            ]);
            return record;
        },
    };
}
export function createPgPermitRepository(client: PoolClient): PermitRepository {
    return {
        async save(record: PermitRecord) {
            await client.query(`INSERT INTO risk_permits (
				   id, organization_id, check_id, intent_hash, authority_epoch, risk_epoch, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
                record.id,
                record.organizationId,
                record.checkId,
                record.intentHash,
                record.authorityEpoch,
                record.riskEpoch,
                record.status,
            ]);
            return record;
        },
    };
}
