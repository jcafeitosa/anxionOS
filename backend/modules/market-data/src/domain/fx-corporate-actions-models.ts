export interface FxRateRecord {
	id: string;
	base_currency: string;
	quote_currency: string;
	rate: string;
	as_of: string;
	source: string;
	created_at: string;
}

export interface CorporateActionRecord {
	id: string;
	organization_id: string;
	instrument_id: string;
	action_kind: string;
	effective_date: string;
	raw_payload: unknown;
	adjustment_factor: string | null;
	source: string;
	recorded_at: string;
}
