import type { Pool, PoolClient } from "pg";
import { PortfoliosCommandError } from "../../application/errors";

type PgQueryable = Pool | PoolClient;

import type {
	HoldingRecord,
	HoldingRepository,
	LedgerApplicationRecord,
	LedgerApplicationRepository,
	PortfolioRecord,
	PortfolioRepository,
	PositionReconciliationCaseRecord,
	PositionReconciliationCaseRepository,
	PositionRecord,
	PositionRepository,
	ProvisionalCashRecord,
	ProvisionalCashRepository,
	ValuationSnapshotRecord,
	ValuationSnapshotRepository,
} from "../../domain/ports/portfolios-unit-of-work";

function isPgUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "23505"
	);
}
function mapPortfolio(row: Record<string, unknown>): PortfolioRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		ownerUserId: String(row.owner_user_id),
		capitalAccountId: String(row.capital_account_id),
		name: String(row.name),
		baseCurrency: String(row.base_currency),
		executionMode: String(row.execution_mode),
		status: String(row.status),
		revision: Number(row.revision),
	};
}
function mapPosition(row: Record<string, unknown>): PositionRecord {
	return {
		id: String(row.id),
		portfolioId: String(row.portfolio_id),
		organizationId: String(row.organization_id),
		instrumentId: String(row.instrument_id),
		positionSide: String(row.position_side),
		book: String(row.book),
		quantity: String(row.quantity),
		revision: Number(row.revision),
	};
}
function mapValuationSnapshot(
	row: Record<string, unknown>,
): ValuationSnapshotRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		portfolioId: String(row.portfolio_id),
		asOf: (row.as_of as Date).toISOString(),
		valuationVersion: Number(row.valuation_version),
		status: String(row.status),
		priceRefsJson: row.price_refs_json,
		fxRefsJson: row.fx_refs_json,
		navBase: String(row.nav_base),
		navComponentsJson: row.nav_components_json,
		qualityFlagsJson: row.quality_flags_json,
		revision: Number(row.revision),
	};
}
function mapHolding(row: Record<string, unknown>): HoldingRecord {
	return {
		id: String(row.id),
		positionId: String(row.position_id),
		organizationId: String(row.organization_id),
		fillId: String(row.fill_id),
		quantity: String(row.quantity),
		price: String(row.price),
		revision: Number(row.revision),
	};
}
export function createPgPortfolioRepository(
	client: PgQueryable,
): PortfolioRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM portfolios_portfolios WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapPortfolio(row) : null;
		},
		async findByOrganizationId(organizationId) {
			const result = await client.query(
				`SELECT * FROM portfolios_portfolios
				 WHERE organization_id = $1
				 ORDER BY created_at ASC, id ASC`,
				[organizationId],
			);
			return result.rows.map((row) => mapPortfolio(row));
		},
		async save(record: PortfolioRecord) {
			await client.query(
				`INSERT INTO portfolios_portfolios (
				   id, organization_id, owner_user_id, capital_account_id, name,
				   base_currency, execution_mode, status, revision
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.ownerUserId,
					record.capitalAccountId,
					record.name,
					record.baseCurrency,
					record.executionMode,
					record.status,
					record.revision,
				],
			);
			return record;
		},
	};
}
export function createPgPositionRepository(
	client: PgQueryable,
): PositionRepository {
	return {
		async findByPortfolioId(portfolioId) {
			const result = await client.query(
				`SELECT * FROM portfolios_positions WHERE portfolio_id = $1 ORDER BY id`,
				[portfolioId],
			);
			return result.rows.map((row) => mapPosition(row));
		},
		async findByPositionKey(portfolioId, instrumentId, positionSide, book) {
			const result = await client.query(
				`SELECT * FROM portfolios_positions
				 WHERE portfolio_id = $1 AND instrument_id = $2 AND position_side = $3 AND book = $4`,
				[portfolioId, instrumentId, positionSide, book],
			);
			const row = result.rows[0];
			return row ? mapPosition(row) : null;
		},
		async save(record: PositionRecord) {
			try {
				await client.query(
					`INSERT INTO portfolios_positions (
					   id, portfolio_id, organization_id, instrument_id, position_side, book, quantity, revision
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
					[
						record.id,
						record.portfolioId,
						record.organizationId,
						record.instrumentId,
						record.positionSide,
						record.book,
						record.quantity,
						record.revision,
					],
				);
				return record;
			} catch (error) {
				if (isPgUniqueViolation(error)) {
					throw new PortfoliosCommandError(
						"PF_DUPLICATE_POSITION_KEY",
						"duplicate position key",
					);
				}
				throw error;
			}
		},
		async updateQuantity(id, delta, revision) {
			const result = await client.query(
				`UPDATE portfolios_positions
				 SET quantity = quantity + $2::numeric, revision = $3
				 WHERE id = $1
				 RETURNING *`,
				[id, delta, revision],
			);
			const row = result.rows[0];
			if (!row) {
				throw new PortfoliosCommandError(
					"PF_PORTFOLIO_NOT_FOUND",
					"position not found for update",
				);
			}
			return mapPosition(row);
		},
	};
}
export function createPgHoldingRepository(
	client: PoolClient,
): HoldingRepository {
	return {
		async findByFillId(organizationId, fillId) {
			const result = await client.query(
				"SELECT * FROM portfolios_holdings WHERE organization_id = $1 AND fill_id = $2",
				[organizationId, fillId],
			);
			const row = result.rows[0];
			return row ? mapHolding(row) : null;
		},
		async save(record: HoldingRecord) {
			try {
				await client.query(
					`INSERT INTO portfolios_holdings (
					   id, position_id, organization_id, fill_id, quantity, price, revision
					 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
					[
						record.id,
						record.positionId,
						record.organizationId,
						record.fillId,
						record.quantity,
						record.price,
						record.revision,
					],
				);
				return record;
			} catch (error) {
				if (isPgUniqueViolation(error)) {
					throw new PortfoliosCommandError(
						"PF_DUPLICATE_IDEMPOTENCY",
						"duplicate fill idempotency",
					);
				}
				throw error;
			}
		},
	};
}
export function createPgProvisionalCashRepository(
	client: PoolClient,
): ProvisionalCashRepository {
	return {
		async findByFillId(organizationId, fillId) {
			const result = await client.query(
				`SELECT * FROM portfolios_provisional_cash
				 WHERE organization_id = $1 AND fill_id = $2`,
				[organizationId, fillId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				portfolioId: String(row.portfolio_id),
				fillId: String(row.fill_id),
				cashDelta: String(row.cash_delta),
				asset: String(row.asset),
				settled: Boolean(row.settled),
				journalEntryId: row.journal_entry_id
					? String(row.journal_entry_id)
					: null,
			};
		},
		async save(record: ProvisionalCashRecord) {
			await client.query(
				`INSERT INTO portfolios_provisional_cash (
				   id, organization_id, portfolio_id, fill_id, cash_delta, asset, settled, journal_entry_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.organizationId,
					record.portfolioId,
					record.fillId,
					record.cashDelta,
					record.asset,
					record.settled,
					record.journalEntryId,
				],
			);
			return record;
		},
		async markSettled(id, journalEntryId) {
			const result = await client.query(
				`UPDATE portfolios_provisional_cash
				 SET settled = TRUE, journal_entry_id = $2
				 WHERE id = $1
				 RETURNING *`,
				[id, journalEntryId],
			);
			const row = result.rows[0];
			if (!row) {
				throw new PortfoliosCommandError(
					"PF_PORTFOLIO_NOT_FOUND",
					"provisional cash not found",
				);
			}
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				portfolioId: String(row.portfolio_id),
				fillId: String(row.fill_id),
				cashDelta: String(row.cash_delta),
				asset: String(row.asset),
				settled: Boolean(row.settled),
				journalEntryId: String(row.journal_entry_id),
			};
		},
	};
}
export function createPgLedgerApplicationRepository(
	client: PoolClient,
): LedgerApplicationRepository {
	return {
		async findByJournalEntryId(organizationId, journalEntryId) {
			const result = await client.query(
				`SELECT * FROM portfolios_ledger_applications
				 WHERE organization_id = $1 AND journal_entry_id = $2`,
				[organizationId, journalEntryId],
			);
			const row = result.rows[0];
			if (!row) return null;
			return {
				id: String(row.id),
				organizationId: String(row.organization_id),
				portfolioId: String(row.portfolio_id),
				journalEntryId: String(row.journal_entry_id),
				cashDelta: String(row.cash_delta),
				asset: String(row.asset),
				fillId: row.fill_id ? String(row.fill_id) : null,
			};
		},
		async save(record: LedgerApplicationRecord) {
			await client.query(
				`INSERT INTO portfolios_ledger_applications (
				   id, organization_id, portfolio_id, journal_entry_id, cash_delta, asset, fill_id
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.portfolioId,
					record.journalEntryId,
					record.cashDelta,
					record.asset,
					record.fillId,
				],
			);
			return record;
		},
	};
}
function mapReconciliationCase(
	row: Record<string, unknown>,
): PositionReconciliationCaseRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		portfolioId: String(row.portfolio_id),
		positionId: row.position_id ? String(row.position_id) : null,
		caseKind: String(
			row.case_kind,
		) as PositionReconciliationCaseRecord["caseKind"],
		status: String(row.status),
		fillId: row.fill_id ? String(row.fill_id) : null,
		journalEntryId: row.journal_entry_id ? String(row.journal_entry_id) : null,
		evidence: row.evidence ? String(row.evidence) : null,
		disposition: row.disposition ? String(row.disposition) : null,
		dispositionRationale: row.disposition_rationale
			? String(row.disposition_rationale)
			: null,
		openedAt: (row.opened_at as Date).toISOString(),
		resolvedAt: row.resolved_at
			? (row.resolved_at as Date).toISOString()
			: null,
	};
}
export function createPgPositionReconciliationCaseRepository(
	client: PoolClient,
): PositionReconciliationCaseRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM portfolios_position_reconciliation_cases WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapReconciliationCase(row) : null;
		},
		async findOpenByFillId(organizationId, fillId, caseKind) {
			const result = await client.query(
				`SELECT * FROM portfolios_position_reconciliation_cases
				 WHERE organization_id = $1 AND fill_id = $2 AND case_kind = $3 AND status = 'OPEN'
				 ORDER BY opened_at DESC
				 LIMIT 1`,
				[organizationId, fillId, caseKind],
			);
			const row = result.rows[0];
			return row ? mapReconciliationCase(row) : null;
		},
		async save(record: PositionReconciliationCaseRecord) {
			await client.query(
				`INSERT INTO portfolios_position_reconciliation_cases (
				   id, organization_id, portfolio_id, position_id, case_kind, status,
				   fill_id, journal_entry_id, evidence, disposition, disposition_rationale,
				   opened_at, resolved_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
				[
					record.id,
					record.organizationId,
					record.portfolioId,
					record.positionId,
					record.caseKind,
					record.status,
					record.fillId,
					record.journalEntryId,
					record.evidence,
					record.disposition,
					record.dispositionRationale,
					record.openedAt,
					record.resolvedAt,
				],
			);
			return record;
		},
		async update(record: PositionReconciliationCaseRecord) {
			await client.query(
				`UPDATE portfolios_position_reconciliation_cases
				 SET status = $2, disposition = $3, disposition_rationale = $4,
				     journal_entry_id = $5, resolved_at = $6
				 WHERE id = $1`,
				[
					record.id,
					record.status,
					record.disposition,
					record.dispositionRationale,
					record.journalEntryId,
					record.resolvedAt,
				],
			);
			return record;
		},
	};
}
export function createPgValuationSnapshotRepository(
	client: PgQueryable,
): ValuationSnapshotRepository {
	return {
		async findByPortfolioAsOf(portfolioId, asOf, valuationVersion) {
			const result = await client.query(
				`SELECT * FROM portfolios_valuation_snapshots
				 WHERE portfolio_id = $1 AND as_of = $2 AND valuation_version = $3`,
				[portfolioId, asOf, valuationVersion],
			);
			const row = result.rows[0];
			return row ? mapValuationSnapshot(row) : null;
		},
		async findLatestByPortfolioId(portfolioId) {
			const result = await client.query(
				`SELECT * FROM portfolios_valuation_snapshots
				 WHERE portfolio_id = $1
				 ORDER BY as_of DESC, valuation_version DESC, created_at DESC
				 LIMIT 1`,
				[portfolioId],
			);
			const row = result.rows[0];
			return row ? mapValuationSnapshot(row) : null;
		},
		async save(record: ValuationSnapshotRecord) {
			await client.query(
				`INSERT INTO portfolios_valuation_snapshots (
				   id, organization_id, portfolio_id, as_of, valuation_version, status,
				   price_refs_json, fx_refs_json, nav_base, nav_components_json,
				   quality_flags_json, revision
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
				[
					record.id,
					record.organizationId,
					record.portfolioId,
					record.asOf,
					record.valuationVersion,
					record.status,
					JSON.stringify(record.priceRefsJson),
					JSON.stringify(record.fxRefsJson),
					record.navBase,
					JSON.stringify(record.navComponentsJson),
					JSON.stringify(record.qualityFlagsJson),
					record.revision,
				],
			);
			return record;
		},
	};
}
