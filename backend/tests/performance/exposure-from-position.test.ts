import { describe, expect, test } from "bun:test";
import {
	derivePositionExposureMetrics,
	OFFICIAL_POSITION_EXPOSURE_METRICS,
} from "@anxionos/performance";

describe("derivePositionExposureMetrics (ANX-154 S2 oracle)", () => {
	test("LONG position: signed quantity equals absolute quantity", () => {
		const metrics = derivePositionExposureMetrics({
			quantity: "10.5",
			positionSide: "LONG",
			provisionalCash: false,
		});
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY)).toBe("10.5");
		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY)).toBe(
			"10.5",
		);
		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.PROVISIONAL_CASH)).toBe(
			"0",
		);
	});

	test("SHORT position: signed quantity is negated", () => {
		const metrics = derivePositionExposureMetrics({
			quantity: "2",
			positionSide: "SHORT",
			provisionalCash: undefined,
		});
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.QUANTITY)).toBe("2");
		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.SIGNED_QUANTITY)).toBe(
			"-2",
		);
	});

	test("provisional cash flag surfaces as 1", () => {
		const metrics = derivePositionExposureMetrics({
			quantity: "100",
			positionSide: "CASH",
			provisionalCash: true,
		});
		const byName = new Map(metrics.map((m) => [m.metricName, m.metricValue]));

		expect(byName.get(OFFICIAL_POSITION_EXPOSURE_METRICS.PROVISIONAL_CASH)).toBe(
			"1",
		);
	});
});
