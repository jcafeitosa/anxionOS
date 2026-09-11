import type { z } from "zod";
import { ledgerLineSummarySchema } from "@anxionos/contracts/accounting";
import {
	cashInstrumentId,
	type PositionReconciliationCaseKind,
} from "@anxionos/contracts/portfolios";

type LedgerLineSummary = z.infer<typeof ledgerLineSummarySchema>;

const CASH_ACCOUNT_CODE = "trading.cash";

export function computeProvisionalCashDelta(input: {
	side: "BUY" | "SELL";
	quantity: string;
	price: string;
}): string {
	const notional = String(Number(input.quantity) * Number(input.price));
	return input.side === "BUY" ? `-${notional}` : notional;
}

export function extractCashDeltaFromLedgerLines(
	linesSummary: LedgerLineSummary[],
	asset: string,
): string {
	let delta = 0;
	for (const line of linesSummary) {
		if (line.accountCode !== CASH_ACCOUNT_CODE || line.asset !== asset) {
			continue;
		}
		delta += Number(line.credit) - Number(line.debit);
	}
	return String(delta);
}

export { cashInstrumentId };

export function isPositionVsLedgerKind(
	caseKind: PositionReconciliationCaseKind,
): boolean {
	return caseKind === "POSITION_VS_LEDGER";
}
