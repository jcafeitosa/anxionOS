import { describe, expect, test } from "bun:test";
import { AdapterGatewayError } from "@anxionos/contracts/adapter-gateway";
import {
	REFERENCE_SIMULATED_ADAPTER_VERSION,
	REFERENCE_SIMULATED_PORT_VERSION,
	referenceSimulatedAdapterManifest,
} from "../adapters/reference-simulated-manifest";
import { InMemoryAdapterRegistry } from "../registry/in-memory-adapter-registry";
import { runAdapterConformanceSuite } from "./run-adapter-conformance-suite";

describe("runAdapterConformanceSuite", () => {
	test("reference SIMULATED manifest passes conformance", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: referenceSimulatedAdapterManifest,
			portVersion: REFERENCE_SIMULATED_PORT_VERSION,
			requiredPortVersion: "1.0.0",
			requestedCapabilities: [
				"marketData",
				"simulation",
				"orderSubmit",
				"accountRead",
			],
			executedAt: "2026-09-10T12:00:00.000Z",
		});
		expect(report.overallOutcome).toBe("PASS");
		expect(report.checks.every((check) => check.passed)).toBe(true);
	});

	test("missing requested capability fails conformance explicitly", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: referenceSimulatedAdapterManifest,
				portVersion: REFERENCE_SIMULATED_PORT_VERSION,
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["transfer"],
			}),
		).toThrow(AdapterGatewayError);
		try {
			runAdapterConformanceSuite({
				manifest: referenceSimulatedAdapterManifest,
				portVersion: REFERENCE_SIMULATED_PORT_VERSION,
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["transfer"],
			});
		} catch (error) {
			expect(error).toBeInstanceOf(AdapterGatewayError);
			expect((error as AdapterGatewayError).code).toBe(
				"AGW_CONFORMANCE_FAILED",
			);
		}
	});

	test("incompatible port major version fails conformance", () => {
		expect(() =>
			runAdapterConformanceSuite({
				manifest: referenceSimulatedAdapterManifest,
				portVersion: "2.0.0",
				requiredPortVersion: "1.0.0",
				requestedCapabilities: ["marketData"],
			}),
		).toThrow(AdapterGatewayError);
	});
});

describe("InMemoryAdapterRegistry", () => {
	test("registers reference adapter and records conformance report", async () => {
		const registry = new InMemoryAdapterRegistry();
		const { report } = runAdapterConformanceSuite({
			manifest: referenceSimulatedAdapterManifest,
			portVersion: REFERENCE_SIMULATED_PORT_VERSION,
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["marketData"],
			executedAt: "2026-09-10T12:00:00.000Z",
		});
		await registry.register({
			manifest: referenceSimulatedAdapterManifest,
			portVersion: REFERENCE_SIMULATED_PORT_VERSION,
			lifecycleStatus: "approved-simulated",
			registeredAt: "2026-09-10T11:00:00.000Z",
		});
		await registry.recordConformanceReport(
			referenceSimulatedAdapterManifest.adapterId,
			REFERENCE_SIMULATED_ADAPTER_VERSION,
			report,
		);
		const stored = await registry.get(
			referenceSimulatedAdapterManifest.adapterId,
			REFERENCE_SIMULATED_ADAPTER_VERSION,
		);
		expect(stored?.lastConformanceReportId).toBe(report.reportId);
	});

	test("rejects digest conflict on re-register", async () => {
		const registry = new InMemoryAdapterRegistry();
		await registry.register({
			manifest: referenceSimulatedAdapterManifest,
			portVersion: REFERENCE_SIMULATED_PORT_VERSION,
			lifecycleStatus: "testing",
			registeredAt: "2026-09-10T11:00:00.000Z",
		});
		await expect(
			registry.register({
				manifest: {
					...referenceSimulatedAdapterManifest,
					imageDigest: "sha256:" + "1".repeat(64),
				},
				portVersion: REFERENCE_SIMULATED_PORT_VERSION,
				lifecycleStatus: "testing",
				registeredAt: "2026-09-10T11:05:00.000Z",
			}),
		).rejects.toMatchObject({ code: "AGW_REGISTRY_CONFLICT" });
	});
});
