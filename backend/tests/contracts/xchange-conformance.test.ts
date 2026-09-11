import { describe, expect, test } from "bun:test";
import {
	xchangeSimulatedAdapterManifest,
	XCHANGE_ADAPTER_ID,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — XChange SIMULATED manifest (ANX-178).
 * REAL runtime conformance requires Java bridge homologation (blocked).
 */
describe("XChange adapter conformance scaffold (ANX-161 / ANX-178)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: xchangeSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(XCHANGE_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: xchangeSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
