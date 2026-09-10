import { describe, expect, test } from "bun:test";
import {
	AdapterGatewayError,
	assertAdapterEventOutcomeKnown,
	assertAdapterManifestSupportsCapabilities,
	negotiateAdapterCapabilities,
	resolveAdapterGatewayErrorStatus,
} from "@anxionos/contracts/adapter-gateway";
import {
	referenceSimulatedAdapterManifest,
	runAdapterConformanceSuite,
} from "@anxionos/adapter-gateway";

describe("adapter gateway conformance contracts", () => {
	test("reference adapter passes conformance suite", () => {
		const { report } = runAdapterConformanceSuite({
			manifest: referenceSimulatedAdapterManifest,
			portVersion: "1.0.0",
			requiredPortVersion: "1.0.0",
			requestedCapabilities: ["orderSubmit", "orderCancel"],
			executedAt: "2026-09-10T12:00:00.000Z",
		});
		expect(report.overallOutcome).toBe("PASS");
	});

	test("missing capability fails with AGW_CAPABILITY_MISSING", () => {
		expect(() =>
			assertAdapterManifestSupportsCapabilities(
				referenceSimulatedAdapterManifest,
				["transfer"],
			),
		).toThrow(AdapterGatewayError);
		try {
			negotiateAdapterCapabilities(referenceSimulatedAdapterManifest, [
				"transfer",
			]);
		} catch (error) {
			expect(error).toBeInstanceOf(AdapterGatewayError);
			expect((error as AdapterGatewayError).code).toBe("AGW_CAPABILITY_MISSING");
			expect(resolveAdapterGatewayErrorStatus("AGW_CAPABILITY_MISSING")).toBe(
				422,
			);
		}
	});

	test("UNKNOWN adapter outcome is not treated as success", () => {
		expect(() =>
			assertAdapterEventOutcomeKnown("UNKNOWN", { adapterId: "demo" }),
		).toThrow(AdapterGatewayError);
		try {
			assertAdapterEventOutcomeKnown("UNKNOWN");
		} catch (error) {
			expect((error as AdapterGatewayError).code).toBe(
				"AGW_UNKNOWN_OUTCOME_STATE",
			);
		}
		expect(() => assertAdapterEventOutcomeKnown("FILLED")).not.toThrow();
	});
});
