import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;

import type {
	CheckResultRecord,
	CheckResultRepository,
	ConsumerDedupRecord,
	ConsumerDedupRepository,
	EpochRegistryRecord,
	EpochRegistryRepository,
	KillSwitchRecord,
	KillSwitchRepository,
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
		denyReasonCode:
			row.deny_reason_code != null ? String(row.deny_reason_code) : null,
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
export function createPgLimitPolicyRepository(
	client: PoolClient,
): LimitPolicyRepository {
	return {
		async findActiveByOrganization(organizationId) {
			const result = await client.query(
				`SELECT * FROM risk_limit_policies
				 WHERE organization_id = $1 AND status = 'ACTIVE'
				 ORDER BY created_at DESC LIMIT 1`,
				[organizationId],
			);
			const row = result.rows[0];
			return row ? mapPolicy(row) : null;
		},
		async save(record: LimitPolicyRecord) {
			await client.query(
				`INSERT INTO risk_limit_policies (
				   id, organization_id, policy_version, max_notional, max_leverage, risk_epoch, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.policyVersion,
					record.maxNotional,
					record.maxLeverage,
					record.riskEpoch,
					record.status,
				],
			);
			return record;
		},
		async supersedeActive(organizationId) {
			await client.query(
				`UPDATE risk_limit_policies SET status = 'SUPERSEDED'
				 WHERE organization_id = $1 AND status = 'ACTIVE'`,
				[organizationId],
			);
		},
	};
}
export function createPgEpochRegistryRepository(
	client: PoolClient,
): EpochRegistryRepository {
	return {
		async findByOrganization(organizationId) {
			const result = await client.query(
				"SELECT * FROM risk_epoch_registry WHERE organization_id = $1",
				[organizationId],
			);
			const row = result.rows[0];
			return row ? mapEpoch(row) : null;
		},
		async upsert(record: EpochRegistryRecord) {
			await client.query(
				`INSERT INTO risk_epoch_registry (organization_id, current_risk_epoch, updated_at)
				 VALUES ($1, $2, now())
				 ON CONFLICT (organization_id)
				 DO UPDATE SET current_risk_epoch = EXCLUDED.current_risk_epoch, updated_at = now()`,
				[record.organizationId, record.currentRiskEpoch],
			);
			return record;
		},
	};
}
export function createPgCheckResultRepository(
	client: PoolClient,
): CheckResultRepository {
	return {
		async findByIntentHash(organizationId, intentHash) {
			const result = await client.query(
				"SELECT * FROM risk_check_results WHERE organization_id = $1 AND intent_hash = $2",
				[organizationId, intentHash],
			);
			const row = result.rows[0];
			return row ? mapCheck(row) : null;
		},
		async save(record: CheckResultRecord) {
			await client.query(
				`INSERT INTO risk_check_results (
				   id, organization_id, portfolio_id, intent_hash, notional_amount,
				   authority_epoch, risk_epoch, execution_mode, check_result, deny_reason_code
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
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
				],
			);
			return record;
		},
	};
}
export function createPgPermitRepository(client: PoolClient): PermitRepository {
	return {
		async findById(organizationId, permitId) {
			const result = await client.query(
				`SELECT * FROM risk_permits
				 WHERE organization_id = $1 AND id = $2`,
				[organizationId, permitId],
			);
			const row = result.rows[0];
			return row ? mapPermit(row) : null;
		},
		async findIssuedBelowEpoch(organizationId, currentRiskEpoch) {
			const result = await client.query(
				`SELECT * FROM risk_permits
				 WHERE organization_id = $1
				   AND status = 'ISSUED'
				   AND risk_epoch < $2
				 ORDER BY created_at`,
				[organizationId, currentRiskEpoch],
			);
			return result.rows.map((row) => mapPermit(row));
		},
		async revokeIssued({ organizationId, permitId }) {
			const result = await client.query(
				`UPDATE risk_permits
				 SET status = 'REVOKED'
				 WHERE organization_id = $1
				   AND id = $2
				   AND status = 'ISSUED'
				 RETURNING *`,
				[organizationId, permitId],
			);
			const row = result.rows[0];
			return row ? mapPermit(row) : null;
		},
		async save(record: PermitRecord) {
			await client.query(
				`INSERT INTO risk_permits (
				   id, organization_id, check_id, intent_hash, authority_epoch, risk_epoch, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.checkId,
					record.intentHash,
					record.authorityEpoch,
					record.riskEpoch,
					record.status,
				],
			);
			return record;
		},
	};
}

export function createPgConsumerDedupRepository(
	client: PoolClient,
): ConsumerDedupRepository {
	return {
		async findByEventId(eventId) {
			const result = await client.query(
				"SELECT * FROM risk_consumer_dedup WHERE event_id = $1",
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
		async save(record: ConsumerDedupRecord) {
			await client.query(
				`INSERT INTO risk_consumer_dedup (event_id, consumer_name, organization_id)
				 VALUES ($1, $2, $3)`,
				[record.eventId, record.consumerName, record.organizationId],
			);
			return record;
		},
	};
}

function mapKillSwitch(row: Record<string, unknown>): KillSwitchRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		scope: String(row.scope),
		portfolioId: row.portfolio_id != null ? String(row.portfolio_id) : null,
		reason: String(row.reason),
		activatedBy: String(row.activated_by),
		riskEpochAtActivation: Number(row.risk_epoch_at_activation),
		active: Boolean(row.active),
	};
}

export function createPgKillSwitchRepository(
	client: PgQueryable,
): KillSwitchRepository {
	return {
		async findActiveForCheck(organizationId, portfolioId) {
			const result = await client.query(
				`SELECT * FROM risk_kill_switch_state
				 WHERE organization_id = $1
				   AND active = TRUE
				   AND (
				     scope = 'ORGANIZATION'
				     OR (scope = 'PORTFOLIO' AND portfolio_id = $2)
				   )
				 ORDER BY CASE scope WHEN 'ORGANIZATION' THEN 0 ELSE 1 END
				 LIMIT 1`,
				[organizationId, portfolioId],
			);
			const row = result.rows[0];
			return row ? mapKillSwitch(row) : null;
		},
		async findOrganizationStatus(organizationId) {
			const activeResult = await client.query(
				`SELECT k.*, e.current_risk_epoch
				 FROM risk_kill_switch_state k
				 LEFT JOIN risk_epoch_registry e ON e.organization_id = k.organization_id
				 WHERE k.organization_id = $1
				   AND k.scope = 'ORGANIZATION'
				   AND k.active = TRUE
				 ORDER BY k.updated_at DESC
				 LIMIT 1`,
				[organizationId],
			);
			const activeRow = activeResult.rows[0];
			if (activeRow) {
				return {
					id: String(activeRow.id),
					organizationId: String(activeRow.organization_id),
					scope: String(activeRow.scope),
					portfolioId:
						activeRow.portfolio_id != null
							? String(activeRow.portfolio_id)
							: null,
					killSwitchActive: true,
					reason: String(activeRow.reason),
					activatedBy: String(activeRow.activated_by),
					activatedAt: new Date(String(activeRow.created_at)).toISOString(),
					releasedAt: null,
					riskEpochAtActivation:
						activeRow.current_risk_epoch != null
							? Number(activeRow.current_risk_epoch)
							: Number(activeRow.risk_epoch_at_activation),
				};
			}
			const epochResult = await client.query(
				"SELECT current_risk_epoch FROM risk_epoch_registry WHERE organization_id = $1",
				[organizationId],
			);
			return {
				organizationId,
				scope: "ORGANIZATION",
				portfolioId: null,
				killSwitchActive: false,
				reason: null,
				activatedBy: null,
				activatedAt: null,
				releasedAt: null,
				riskEpochAtActivation:
					epochResult.rows[0]?.current_risk_epoch != null
						? Number(epochResult.rows[0].current_risk_epoch)
						: 0,
			};
		},
		async save(record: KillSwitchRecord) {
			await client.query(
				`INSERT INTO risk_kill_switch_state (
				   id, organization_id, scope, portfolio_id, reason, activated_by,
				   risk_epoch_at_activation, active, updated_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())`,
				[
					record.id,
					record.organizationId,
					record.scope,
					record.portfolioId,
					record.reason,
					record.activatedBy,
					record.riskEpochAtActivation,
					record.active,
				],
			);
			return record;
		},
		async deactivate({ organizationId, scope, portfolioId }) {
			const result = await client.query(
				`UPDATE risk_kill_switch_state
				 SET active = FALSE, released_at = now(), updated_at = now()
				 WHERE organization_id = $1
				   AND scope = $2
				   AND COALESCE(portfolio_id, '') = COALESCE($3, '')
				   AND active = TRUE
				 RETURNING *`,
				[organizationId, scope, portfolioId],
			);
			const row = result.rows[0];
			return row ? mapKillSwitch(row) : null;
		},
	};
}
