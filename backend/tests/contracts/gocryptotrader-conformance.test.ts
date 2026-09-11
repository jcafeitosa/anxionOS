import { describe, expect, test } from "bun:test";
import {
	gocryptotraderSimulatedAdapterManifest,
	GOCRYPTOTRADER_ADAPTER_ID,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — GoCryptoTrader SIMULATED manifest (ANX-175).
 * REAL runtime conformance requires upstream binary homologation (blocked).
 */
describe("GoCryptoTrader adapter conformance scaffold (ANX-161 / ANX-175)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: gocryptotraderSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(GOCRYPTOTRADER_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: gocryptotraderSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
