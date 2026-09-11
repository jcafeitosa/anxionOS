import { describe, expect, test } from "bun:test";
import { buildTradeFillLines } from "../../modules/accounting/src/application/commands/post-trade-fill";
import {
	deriveLedgerPnlMetrics,
	OFFICIAL_LEDGER_PNL_METRICS,
} from "@anxionos/performance";

describe("deriveLedgerPnlMetrics (ANX-154 S2 oracle)", () => {
	test("BUY trade fill without fees: cash net equals notional", () => {
		const lines = buildTradeFillLines({
			side: "BUY",
			notionalAmount: "1000.00",
			asset: "USD",
			feeAmount: undefined,
			feeAsset: undefined,
		});
		const metrics = deriveLedgerPnlMetrics(lines);
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA)).toBe(
			"1000",
		);
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL)).toBe("0");
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL)).toBe(
			"1000",
		);
	});

	test("SELL trade fill with fees: fees_total and cash net reconcile", () => {
		const lines = buildTradeFillLines({
			side: "SELL",
			notionalAmount: "500.25",
			asset: "USD",
			feeAmount: "2.50",
			feeAsset: "USD",
		});
		const metrics = deriveLedgerPnlMetrics(lines);
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL)).toBe("2.5");
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL)).toBe(
			"500.25",
		);
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA)).toBe(
			"-502.75",
		);
	});

	test("ignores unrelated account codes", () => {
		const metrics = deriveLedgerPnlMetrics([
			{
				accountCode: "equity.retained",
				debit: "10",
				credit: "0",
				asset: "USD",
				amount: "10",
			},
			{
				accountCode: "equity.retained",
				debit: "0",
				credit: "10",
				asset: "USD",
				amount: "10",
			},
		]);
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA)).toBe("0");
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL)).toBe("0");
		expect(byName.get(OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL)).toBe("0");
	});
});
