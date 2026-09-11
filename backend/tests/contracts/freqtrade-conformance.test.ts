import { describe, expect, test } from "bun:test";
import {
	FREQTRADE_ADAPTER_ID,
	freqtradeSimulatedAdapterManifest,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — Freqtrade SIMULATED manifest (ANX-177).
 * REAL runtime conformance requires upstream runtime homologation (blocked).
 */
describe("Freqtrade adapter conformance scaffold (ANX-161 / ANX-177)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: freqtradeSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(FREQTRADE_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: freqtradeSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
