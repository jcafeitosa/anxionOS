import type {
	CorporateActionRecord,
	FxRateRecord,
} from "../fx-corporate-actions-models";

// ── FxRateRepository ──────────────────────────────────────────────────────────────
export interface FxRateRepository {
	/**
	 * Returns the FX rate with the greatest `as_of` that is <= the given asOf.
	 * No lookahead: if no row satisfies as_of <= $asOf, returns null.
	 */
	findLatestAsOf(
		base: string,
		quote: string,
		asOf: string,
	): Promise<FxRateRecord | null>;

	/**
	 * Idempotent save: ON CONFLICT ... DO UPDATE ... RETURNING.
	 * A duplicate identical (base,quote,as_of,source) returns the existing row,
	 * never creates a second row.
	 */
	save(rate: FxRateRecord): Promise<FxRateRecord>;
}

// ── CorporateActionRepository ─────────────────────────────────────────────────────
export interface CorporateActionRepository {
	/**
	 * Returns corporate actions for the given instrument + organization,
	 * filtered to only those with recorded_at <= asOf (point-in-time):
	 * no lookahead into corrections recorded later.
	 */
	findByInstrumentAsOf(
		instrumentId: string,
		organizationId: string,
		asOf: string,
	): Promise<CorporateActionRecord[]>;

	/**
	 * Idempotent save: ON CONFLICT ... DO UPDATE ... RETURNING.
	 * A duplicate identical (organization_id, instrument_id, action_kind,
	 * effective_date, source) returns the existing row.
	 */
	save(action: CorporateActionRecord): Promise<CorporateActionRecord>;
}
