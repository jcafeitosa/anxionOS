import type { RecordPositionExposureSnapshotCommand } from "@anxionos/contracts/performance";
import {
	normalizeDecimalAmount,
	subtractDecimalAmounts,
} from "../domain/decimal-amount";
import { OFFICIAL_POSITION_EXPOSURE_METRICS } from "../domain/metric-definitions";

export interface DerivedPositionExposureMetric {
	metricName: string;
	metricValue: string;
}

function negateDecimalAmount(value: string): string {
	return subtractDecimalAmounts("0", value);
}

function signedQuantity(
	quantity: string,
	positionSide: RecordPositionExposureSnapshotCommand["positionSide"],
): string {
	const normalized = normalizeDecimalAmount(quantity);
	if (positionSide === "SHORT") {
		return negateDecimalAmount(normalized);
	}
	return normalized;
}

export function derivePositionExposureMetrics(
	input: Pick<
		RecordPositionExposureSnapshotCommand,
		"quantity" | "positionSide" | "provisionalCash"
	>,
): DerivedPositionExposureMetric[] {
	const quantity = normalizeDecimalAmount(input.quantity);
	const signed = signedQuantity(input.quantity, input.positionSide);
	const provisionalCash = input.provisionalCash ? "1" : "0";

	return [
		{
			metricName: OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY,
			metricValue: quantity,
		},
		{
			metricName: OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY,
			metricValue: signed,
		},
		{
			metricName: OFFICIAL_POSITION_EXPOSURE_METRICS.PROVISIONAL_CASH,
			metricValue: provisionalCash,
		},
	];
}
