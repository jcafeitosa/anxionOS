import type { PoolClient } from "pg";
import { PortfoliosCommandError } from "../../application/errors";
import type {
	HoldingRecord,
	HoldingRepository,
	PortfolioRecord,
	PortfolioRepository,
	PositionRecord,
	PositionRepository,
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
	client: PoolClient,
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
	client: PoolClient,
): PositionRepository {
	return {
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
