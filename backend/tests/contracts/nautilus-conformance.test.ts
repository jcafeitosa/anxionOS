import { describe, expect, test } from "bun:test";
import {
	NAUTILUS_ADAPTER_ID,
	nautilusSimulatedAdapterManifest,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — NautilusTrader SIMULATED manifest (ANX-174).
 * REAL runtime conformance requires upstream Python/Rust runtime homologation (blocked).
 */
describe("NautilusTrader adapter conformance scaffold (ANX-161 / ANX-174)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: nautilusSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(NAUTILUS_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("manifest declares STOCK and CRYPTO asset classes", () => {
		expect(nautilusSimulatedAdapterManifest.assetClasses).toEqual([
			"STOCK",
			"CRYPTO",
		]);
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: nautilusSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
