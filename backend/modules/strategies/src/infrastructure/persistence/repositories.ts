import type { PoolClient } from "pg";
import type {
  StrategiesExecutionMode,
  StrategyRecord,
  StrategyRepository,
  StrategyStatus,
  StrategyVersionLifecycle,
  StrategyVersionRecord,
  StrategyVersionRepository,
} from "../../domain/ports/strategies-unit-of-work";

type StrategyRow = {
  id: string;
  organization_id: string;
  display_name: string;
  description: string | null;
  execution_mode: string;
  status: string;
  revision: number;
};

type StrategyVersionRow = {
  id: string;
  strategy_id: string;
  organization_id: string;
  version_number: number;
  source_hash: string;
  rules_hash: string;
  parameters_hash: string;
  lifecycle_state: string;
  execution_mode: string;
  revision: number;
  published_at: string | Date | null;
};

function mapStrategy(row: StrategyRow): StrategyRecord {
    return {
        id: row.id,
        organizationId: row.organization_id,
        displayName: row.display_name,
        description: row.description ?? null,
        executionMode: row.execution_mode as StrategiesExecutionMode,
        status: row.status as StrategyStatus,
        revision: row.revision,
    };
}
function mapVersion(row: StrategyVersionRow): StrategyVersionRecord {
    return {
        id: row.id,
        strategyId: row.strategy_id,
        organizationId: row.organization_id,
        versionNumber: row.version_number,
        sourceHash: row.source_hash,
        rulesHash: row.rules_hash,
        parametersHash: row.parameters_hash,
        lifecycleState: row.lifecycle_state as StrategyVersionLifecycle,
        executionMode: row.execution_mode as StrategiesExecutionMode,
        revision: row.revision,
        publishedAt: row.published_at ? String(row.published_at) : null,
    };
}
export function createPgStrategyRepository(client: PoolClient): StrategyRepository {
    return {
        async findById(strategyId, organizationId) {
            const result = await client.query(`SELECT * FROM strategies WHERE id = $1 AND organization_id = $2`, [strategyId, organizationId]);
            const row = result.rows[0];
            return row ? mapStrategy(row) : null;
        },
        async findActiveByNaturalKey(organizationId, displayName) {
            const result = await client.query(`SELECT * FROM strategies WHERE organization_id = $1 AND display_name = $2 AND status = 'ACTIVE'`, [organizationId, displayName]);
            const row = result.rows[0];
            return row ? mapStrategy(row) : null;
        },
        async save(record) {
            await client.query(`INSERT INTO strategies (id, organization_id, display_name, description, execution_mode, status, revision)
				 VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
                record.id,
                record.organizationId,
                record.displayName,
                record.description,
                record.executionMode,
                record.status,
                record.revision,
            ]);
            return record;
        },
        async update(record) {
            await client.query(`UPDATE strategies SET revision = $3, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`, [record.id, record.organizationId, record.revision]);
            return record;
        },
    };
}
export function createPgStrategyVersionRepository(client: PoolClient): StrategyVersionRepository {
    return {
        async findById(versionId, organizationId) {
            const result = await client.query(`SELECT * FROM strategy_versions WHERE id = $1 AND organization_id = $2`, [versionId, organizationId]);
            const row = result.rows[0];
            return row ? mapVersion(row) : null;
        },
        async countByStrategy(strategyId) {
            const result = await client.query(`SELECT count(*)::int AS c FROM strategy_versions WHERE strategy_id = $1`, [strategyId]);
            return Number(result.rows[0].c);
        },
        async save(record) {
            await client.query(`INSERT INTO strategy_versions (id, strategy_id, organization_id, version_number,
				 source_hash, rules_hash, parameters_hash, lifecycle_state, execution_mode, revision, published_at)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                record.id,
                record.strategyId,
                record.organizationId,
                record.versionNumber,
                record.sourceHash,
                record.rulesHash,
                record.parametersHash,
                record.lifecycleState,
                record.executionMode,
                record.revision,
                record.publishedAt,
            ]);
            return record;
        },
        async update(record) {
            await client.query(`UPDATE strategy_versions SET lifecycle_state = $3::strategy_version_lifecycle,
				 revision = $4, published_at = $5, updated_at = now()
				 WHERE id = $1 AND organization_id = $2`, [
                record.id,
                record.organizationId,
                record.lifecycleState,
                record.revision,
                record.publishedAt,
            ]);
            return record;
        },
    };
}
