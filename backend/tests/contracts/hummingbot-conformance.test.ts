import { describe, expect, test } from "bun:test";
import {
	HUMMINGBOT_ADAPTER_ID,
	hummingbotSimulatedAdapterManifest,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — Hummingbot SIMULATED manifest (ANX-176).
 * REAL runtime conformance requires upstream runtime homologation (blocked).
 */
describe("Hummingbot adapter conformance scaffold (ANX-161 / ANX-176)", () => {
	test("SIMULATED manifest passes conformance suite with marketData + simulation only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: hummingbotSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData", "simulation"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(HUMMINGBOT_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: hummingbotSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
