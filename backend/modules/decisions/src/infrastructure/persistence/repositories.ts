import type { PoolClient } from "pg";
import { DecisionsCommandError } from "../../application/errors";
import type {
	ApprovalRecord,
	ApprovalRepository,
	DecisionRecord,
	DecisionRepository,
	DispositionRecord,
	DispositionRepository,
	ProposalRecord,
	ProposalRepository,
	TradeIntentRecord,
	TradeIntentRepository,
} from "../../domain/ports/decisions-unit-of-work";

function isPgUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
}
function mapDecision(row: Record<string, unknown>): DecisionRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		grantId: String(row.grant_id),
		expectedAuthorityEpoch: Number(row.expected_authority_epoch),
		correlationId: String(row.correlation_id),
		status: String(row.status),
		revision: Number(row.revision),
		proposerId: row.proposer_id ? String(row.proposer_id) : undefined,
		runId: row.run_id ? String(row.run_id) : undefined,
		approvalPath: Boolean(row.approval_path),
	};
}
function mapProposal(row: Record<string, unknown>): ProposalRecord {
	return {
		id: String(row.id),
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		proposalKind: String(row.proposal_kind),
		status: String(row.status),
	};
}
function mapTradeIntent(row: Record<string, unknown>): TradeIntentRecord {
	return {
		id: String(row.id),
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		intentHash: String(row.intent_hash),
		instrumentId: String(row.instrument_id),
		side: String(row.side),
		quantity: String(row.quantity),
		price: String(row.price),
		executionMode: String(row.execution_mode),
	};
}
function mapApproval(row: Record<string, unknown>): ApprovalRecord {
	return {
		id: String(row.id),
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		proposerId: String(row.proposer_id),
		approverId: row.approver_id ? String(row.approver_id) : undefined,
		status: String(row.status),
		runId: row.run_id ? String(row.run_id) : undefined,
		operationId: row.operation_id ? String(row.operation_id) : undefined,
	};
}
function mapDisposition(row: Record<string, unknown>): DispositionRecord {
	return {
		id: String(row.id),
		decisionId: String(row.decision_id),
		organizationId: String(row.organization_id),
		dispositionKind: String(row.disposition_kind),
		outcome: String(row.outcome),
		reason: String(row.reason),
		approverId: String(row.approver_id),
		intentHash: row.intent_hash ? String(row.intent_hash) : undefined,
	};
}
export function createPgDecisionRepository(
	client: PoolClient,
): DecisionRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM decisions_records WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapDecision(row) : null;
		},
		async save(record: DecisionRecord) {
			await client.query(
				`INSERT INTO decisions_records (
				   id, organization_id, grant_id, expected_authority_epoch, correlation_id,
				   status, revision, proposer_id, run_id, approval_path
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.grantId,
					record.expectedAuthorityEpoch,
					record.correlationId,
					record.status,
					record.revision,
					record.proposerId ?? null,
					record.runId ?? null,
					record.approvalPath,
				],
			);
			return record;
		},
		async updateStatus(id, status, revision) {
			const result = await client.query(
				"UPDATE decisions_records SET status = $2, revision = $3 WHERE id = $1 RETURNING *",
				[id, status, revision],
			);
			const row = result.rows[0];
			if (!row) {
				throw new DecisionsCommandError(
					"DC_DECISION_NOT_FOUND",
					"decision not found for update",
				);
			}
			return mapDecision(row);
		},
		async updateApprovalPath(id, input) {
			const result = await client.query(
				`UPDATE decisions_records
				 SET status = $2,
				     revision = $3,
				     proposer_id = COALESCE($4, proposer_id),
				     run_id = COALESCE($5, run_id),
				     approval_path = $6
				 WHERE id = $1
				 RETURNING *`,
				[
					id,
					input.status,
					input.revision,
					input.proposerId ?? null,
					input.runId ?? null,
					input.approvalPath,
				],
			);
			const row = result.rows[0];
			if (!row) {
				throw new DecisionsCommandError(
					"DC_DECISION_NOT_FOUND",
					"decision not found for approval path update",
				);
			}
			return mapDecision(row);
		},
	};
}
export function createPgProposalRepository(
	client: PoolClient,
): ProposalRepository {
	return {
		async findOpenByDecisionId(decisionId) {
			const result = await client.query(
				`SELECT * FROM decisions_proposals WHERE decision_id = $1 AND status = 'OPEN' LIMIT 1`,
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapProposal(row) : null;
		},
		async save(record: ProposalRecord) {
			await client.query(
				`INSERT INTO decisions_proposals (
				   id, decision_id, organization_id, proposal_kind, status
				 ) VALUES ($1,$2,$3,$4,$5)`,
				[
					record.id,
					record.decisionId,
					record.organizationId,
					record.proposalKind,
					record.status,
				],
			);
			return record;
		},
	};
}
export function createPgTradeIntentRepository(
	client: PoolClient,
): TradeIntentRepository {
	return {
		async findByDecisionId(decisionId) {
			const result = await client.query(
				"SELECT * FROM decisions_trade_intents WHERE decision_id = $1",
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapTradeIntent(row) : null;
		},
		async save(record: TradeIntentRecord) {
			try {
				await client.query(
					`INSERT INTO decisions_trade_intents (
					   id, decision_id, organization_id, intent_hash, instrument_id, side, quantity, price, execution_mode
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
					[
						record.id,
						record.decisionId,
						record.organizationId,
						record.intentHash,
						record.instrumentId,
						record.side,
						record.quantity,
						record.price,
						record.executionMode,
					],
				);
				return record;
			} catch (error: unknown) {
				if (isPgUniqueViolation(error)) {
					throw new DecisionsCommandError(
						"DC_INTENT_IMMUTABLE",
						"trade intent already submitted",
					);
				}
				throw error;
			}
		},
	};
}
export function createPgApprovalRepository(
	client: PoolClient,
): ApprovalRepository {
	return {
		async findPendingByDecisionId(decisionId) {
			const result = await client.query(
				`SELECT * FROM decisions_approvals
				 WHERE decision_id = $1 AND status = 'PENDING'
				 LIMIT 1`,
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapApproval(row) : null;
		},
		async save(record: ApprovalRecord) {
			await client.query(
				`INSERT INTO decisions_approvals (
				   id, decision_id, organization_id, proposer_id, approver_id, status, run_id, operation_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.decisionId,
					record.organizationId,
					record.proposerId,
					record.approverId ?? null,
					record.status,
					record.runId ?? null,
					record.operationId ?? null,
				],
			);
			return record;
		},
		async grant(id, approverId) {
			const result = await client.query(
				`UPDATE decisions_approvals
				 SET status = 'GRANTED', approver_id = $2, decided_at = NOW()
				 WHERE id = $1
				 RETURNING *`,
				[id, approverId],
			);
			const row = result.rows[0];
			if (!row) {
				throw new DecisionsCommandError(
					"DC_APPROVAL_NOT_PENDING",
					"approval not found for grant",
				);
			}
			return mapApproval(row);
		},
	};
}
export function createPgDispositionRepository(
	client: PoolClient,
): DispositionRepository {
	return {
		async findByDecisionId(decisionId) {
			const result = await client.query(
				"SELECT * FROM decisions_dispositions WHERE decision_id = $1",
				[decisionId],
			);
			const row = result.rows[0];
			return row ? mapDisposition(row) : null;
		},
		async save(record: DispositionRecord) {
			try {
				await client.query(
					`INSERT INTO decisions_dispositions (
					   id, decision_id, organization_id, disposition_kind, outcome, reason, approver_id, intent_hash
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
					[
						record.id,
						record.decisionId,
						record.organizationId,
						record.dispositionKind,
						record.outcome,
						record.reason,
						record.approverId,
						record.intentHash ?? null,
					],
				);
				return record;
			} catch (error: unknown) {
				if (isPgUniqueViolation(error)) {
					throw new DecisionsCommandError(
						"DC_DISPOSITION_INVALID",
						"disposition already recorded",
					);
				}
				throw error;
			}
		},
	};
}
