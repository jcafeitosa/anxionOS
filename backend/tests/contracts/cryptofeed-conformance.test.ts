import { describe, expect, test } from "bun:test";
import {
	cryptofeedSimulatedAdapterManifest,
	CRYPTOFEED_ADAPTER_ID,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

/**
 * ANX-161 readiness scaffold — Cryptofeed SIMULATED manifest (ANX-179).
 * Data-only feeds; REAL runtime conformance requires upstream Python homologation (blocked).
 */
describe("Cryptofeed adapter conformance scaffold (ANX-161 / ANX-179)", () => {
	test("SIMULATED manifest passes conformance suite with marketData only", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: cryptofeedSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData"],
			executedAt: "2026-09-11T12:00:00.000Z",
		});

		expect(report.overallOutcome).toBe("PASS");
		expect(report.adapterId).toBe(CRYPTOFEED_ADAPTER_ID);
		expect(report.environment).toBe("SIMULATED");
	});

	test("manifest declares CRYPTO asset class and market-data owner", () => {
		expect(cryptofeedSimulatedAdapterManifest.assetClasses).toEqual(["CRYPTO"]);
		expect(cryptofeedSimulatedAdapterManifest.owner).toBe("market-data");
		expect(cryptofeedSimulatedAdapterManifest.capabilities.simulation).toBe(
			false,
		);
	});

	test("orderSubmit not declared — conformance fails when requested", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: cryptofeedSimulatedAdapterManifest,
				portVersion: "1.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["orderSubmit"],
				executedAt: "2026-09-11T12:00:00.000Z",
			}),
		).toThrow();
	});
});
