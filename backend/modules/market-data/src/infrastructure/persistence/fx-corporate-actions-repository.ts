import type { Pool, PoolClient } from "pg";
import type {
	CorporateActionRecord,
	FxRateRecord,
} from "../../domain/fx-corporate-actions-models";
import type {
	CorporateActionRepository,
	FxRateRepository,
} from "../../domain/ports/fx-corporate-actions-repository";

function mapFxRateRow(row: Record<string, unknown>): FxRateRecord {
	return {
		id: String(row.id),
		base_currency: String(row.base_currency),
		quote_currency: String(row.quote_currency),
		rate: String(row.rate),
		as_of: (row.as_of as Date).toISOString(),
		source: String(row.source),
		created_at: (row.created_at as Date).toISOString(),
	};
}

function mapCorporateActionRow(
	row: Record<string, unknown>,
): CorporateActionRecord {
	return {
		id: String(row.id),
		organization_id: String(row.organization_id),
		instrument_id: String(row.instrument_id),
		action_kind: String(row.action_kind),
		effective_date: (row.effective_date as Date).toISOString().split("T")[0],
		raw_payload: row.raw_payload,
		adjustment_factor:
			row.adjustment_factor != null ? String(row.adjustment_factor) : null,
		source: String(row.source),
		recorded_at: (row.recorded_at as Date).toISOString(),
	};
}

// ── createPgFxRateRepository ────────────────────────────────────────────────────
export function createPgFxRateRepository(
	client: Pool | PoolClient,
): FxRateRepository {
	return {
		async findLatestAsOf(base, quote, asOf) {
			const result = await (client as any).query(
				`SELECT * FROM market_data_fx_rates
				 WHERE base_currency = $1 AND quote_currency = $2 AND as_of <= $3
				 ORDER BY as_of DESC
				 LIMIT 1`,
				[base, quote, asOf],
			);
			const row = result.rows[0];
			return row ? mapFxRateRow(row) : null;
		},

		async save(rate: FxRateRecord): Promise<FxRateRecord> {
			const id =
				rate.id ?? `md_fx_${Math.random().toString(36).substring(2, 24)}`;
			const result = await (client as any).query(
				`INSERT INTO market_data_fx_rates (
					id, base_currency, quote_currency, rate, as_of, source, created_at
				) VALUES ($1,$2,$3,$4,$5,$6,$7)
				 ON CONFLICT (base_currency, quote_currency, as_of, source)
				 DO UPDATE SET id = market_data_fx_rates.id
				 RETURNING *`,
				[
					id,
					rate.base_currency,
					rate.quote_currency,
					rate.rate,
					rate.as_of,
					rate.source,
					new Date(rate.created_at),
				],
			);
			return mapFxRateRow(result.rows[0]);
		},
	};
}

// ── createPgCorporateActionRepository ───────────────────────────────────────────
export function createPgCorporateActionRepository(
	client: Pool | PoolClient,
): CorporateActionRepository {
	return {
		async findByInstrumentAsOf(instrumentId, organizationId, asOf) {
			const result = await (client as any).query(
				`SELECT * FROM market_data_corporate_actions
				 WHERE organization_id = $1 AND instrument_id = $2 AND recorded_at <= $3
				 ORDER BY recorded_at DESC`,
				[organizationId, instrumentId, asOf],
			);
			return result.rows.map(mapCorporateActionRow);
		},

		async save(action: CorporateActionRecord): Promise<CorporateActionRecord> {
			const id =
				action.id ?? `md_ca_${Math.random().toString(36).substring(2, 24)}`;
			const result = await (client as any).query(
				`INSERT INTO market_data_corporate_actions (
					id, organization_id, instrument_id, action_kind, effective_date,
					raw_payload, adjustment_factor, source, recorded_at
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
				 ON CONFLICT (organization_id, instrument_id, action_kind, effective_date, source)
				 DO UPDATE SET id = market_data_corporate_actions.id
				 RETURNING *`,
				[
					id,
					action.organization_id,
					action.instrument_id,
					action.action_kind,
					action.effective_date,
					JSON.stringify(action.raw_payload),
					action.adjustment_factor != null
						? Number(action.adjustment_factor)
						: null,
					action.source,
					new Date(action.recorded_at),
				],
			);
			return mapCorporateActionRow(result.rows[0]);
		},
	};
}
