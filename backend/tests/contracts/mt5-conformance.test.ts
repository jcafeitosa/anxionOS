import { describe, expect, test } from "bun:test";
import {
	MT5_ADAPTER_ID,
	mt5SimulatedAdapterManifest,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — MetaTrader 5 SIMULATED manifest (ANX-180).
 * REAL runtime conformance requires Windows terminal + Wine/bridge homologation (blocked).
 */
describe("MT5 adapter conformance scaffold (ANX-161 / ANX-180)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: mt5SimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(MT5_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("manifest declares STOCK asset class (FOREX/CFD pending schema) and execution owner", () => {
		expect(mt5SimulatedAdapterManifest.assetClasses).toEqual(["STOCK"]);
		expect(mt5SimulatedAdapterManifest.owner).toBe("execution");
		expect(mt5SimulatedAdapterManifest.capabilities.simulation).toBe(true);
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: mt5SimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
