import type { RecordOutcomeSnapshotCommand } from "@anxionos/contracts/performance";
import {
	addDecimalAmounts,
	subtractDecimalAmounts,
} from "../domain/decimal-amount";
import { OFFICIAL_LEDGER_PNL_METRICS } from "../domain/metric-definitions";

type LedgerLine = RecordOutcomeSnapshotCommand["linesSummary"][number];

export interface DerivedLedgerPnlMetric {
	metricName: string;
	metricValue: string;
}

function sumLineField(
	lines: LedgerLine[],
	accountCode: string,
	field: "debit" | "credit" | "amount",
): string {
	let total = "0";
	for (const line of lines) {
		if (line.accountCode !== accountCode) continue;
		total = addDecimalAmounts(total, line[field]);
	}
	return total;
}

export function deriveLedgerPnlMetrics(
	linesSummary: LedgerLine[],
): DerivedLedgerPnlMetric[] {
	const cashDebits = sumLineField(
		linesSummary,
		"trading.cash",
		"debit",
	);
	const cashCredits = sumLineField(
		linesSummary,
		"trading.cash",
		"credit",
	);
	const feesTotal = sumLineField(linesSummary, "trading.fees", "debit");
	const notionalTotal = sumLineField(
		linesSummary,
		"trading.clearing",
		"amount",
	);

	return [
		{
			metricName: OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA,
			metricValue: subtractDecimalAmounts(cashDebits, cashCredits),
		},
		{
			metricName: OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL,
			metricValue: feesTotal,
		},
		{
			metricName: OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL,
			metricValue: notionalTotal,
		},
	];
}
