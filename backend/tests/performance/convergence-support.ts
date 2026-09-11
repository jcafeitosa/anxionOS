import {
	OFFICIAL_LEDGER_PNL_METRICS,
	OFFICIAL_POSITION_EXPOSURE_METRICS,
} from "@anxionos/performance";
import { normalizeDecimalAmount } from "../../modules/performance/src/domain/decimal-amount";

export interface LedgerPositionConvergenceInput {
	tradeSide: "BUY" | "SELL";
	cashNetDelta: string;
	signedQuantity: string;
}

/**
 * Minimal G5-PERF-02 divergence detector for ledger vs position within the same
 * agency/portfolio trade context. Returns human-readable divergence reasons.
 */
export function detectLedgerPositionDivergence(
	input: LedgerPositionConvergenceInput,
): string[] {
	const reasons: string[] = [];
	const cashNet = normalizeDecimalAmount(input.cashNetDelta);
	const signedQty = normalizeDecimalAmount(input.signedQuantity);

	const cashPositive = cashNet !== "0" && !cashNet.startsWith("-");
	const signedPositive = signedQty !== "0" && !signedQty.startsWith("-");

	if (input.tradeSide === "BUY") {
		if (!cashPositive) {
			reasons.push("BUY ledger expects positive cash_net_delta");
		}
		if (!signedPositive) {
			reasons.push(
				"BUY trade expects positive signed_quantity (LONG exposure)",
			);
		}
	} else {
		if (cashPositive) {
			reasons.push("SELL ledger expects negative cash_net_delta");
		}
		if (signedPositive) {
			reasons.push(
				"SELL trade expects negative signed_quantity (reduced LONG or SHORT)",
			);
		}
	}

	return reasons;
}

type MetricRow =
	| { metricName: string; metricValue: string }
	| { metric_name: string; metric_value: string };

export function metricsToMap(metrics: MetricRow[]): Map<string, string> {
	return new Map(
		metrics.map((metric) => {
			if ("metric_name" in metric) {
				return [metric.metric_name, metric.metric_value];
			}
			return [metric.metricName, metric.metricValue];
		}),
	);
}

export function assertDerivedMetricsMatch(
	actual: Map<string, string>,
	expected: Array<{ metricName: string; metricValue: string }>,
): void {
	for (const metric of expected) {
		const stored = actual.get(metric.metricName);
		if (stored === undefined) {
			throw new Error(`missing metric ${metric.metricName}`);
		}
		if (
			normalizeDecimalAmount(stored) !==
			normalizeDecimalAmount(metric.metricValue)
		) {
			throw new Error(
				`metric ${metric.metricName} mismatch: stored=${stored} expected=${metric.metricValue}`,
			);
		}
	}
}

export function extractLedgerConvergenceFields(
	metrics: Map<string, string>,
): Pick<LedgerPositionConvergenceInput, "cashNetDelta"> {
	return {
		cashNetDelta:
			metrics.get(OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA) ?? "0",
	};
}

export function extractPositionConvergenceFields(
	metrics: Map<string, string>,
): Pick<LedgerPositionConvergenceInput, "signedQuantity"> {
	return {
		signedQuantity:
			metrics.get(OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY) ?? "0",
	};
}
