export const OFFICIAL_LEDGER_PNL_METRICS = {
	CASH_NET_DELTA: "pnl.cash_net_delta",
	FEES_TOTAL: "pnl.fees_total",
	NOTIONAL_TOTAL: "pnl.notional_total",
} as const;

export type OfficialLedgerPnlMetricCode =
	(typeof OFFICIAL_LEDGER_PNL_METRICS)[keyof typeof OFFICIAL_LEDGER_PNL_METRICS];

export const OFFICIAL_POSITION_EXPOSURE_METRICS = {
	QUANTITY: "exposure.quantity",
	SIGNED_QUANTITY: "exposure.signed_quantity",
	PROVISIONAL_CASH: "exposure.provisional_cash",
} as const;

export type OfficialPositionExposureMetricCode =
	(typeof OFFICIAL_POSITION_EXPOSURE_METRICS)[keyof typeof OFFICIAL_POSITION_EXPOSURE_METRICS];
