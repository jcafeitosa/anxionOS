import { randomUUID } from "node:crypto";
import {
	ADAPTER_CONFORMANCE_CHECK_IDS,
	ADAPTER_CONFORMANCE_SUITE_VERSION,
	AdapterGatewayError,
	adapterCapabilityKeySchema,
	adapterConformanceReportSchema,
	adapterManifestSchema,
	assertAdapterCapabilitiesExplicit,
	assertAdapterPortVersionCompatible,
	type AdapterCapabilityKey,
	type AdapterConformanceCheckResult,
	type AdapterConformanceReport,
	type AdapterManifest,
} from "@anxionos/contracts/adapter-gateway";

export interface RunAdapterConformanceSuiteInput {
	manifest: AdapterManifest;
	portVersion: string;
	requiredPortVersion: string;
	requestedCapabilities: AdapterCapabilityKey[];
	executedAt?: string;
}

export interface RunAdapterConformanceSuiteResult {
	report: AdapterConformanceReport;
}

function pushCheck(
	checks: AdapterConformanceCheckResult[],
	checkId: string,
	passed: boolean,
	message: string,
	limitation?: string,
): void {
	checks.push({ checkId, passed, message, limitation });
}

export function runAdapterConformanceSuite(
	input: RunAdapterConformanceSuiteInput,
): RunAdapterConformanceSuiteResult {
	const checks: AdapterConformanceCheckResult[] = [];
	const capabilityResults = adapterCapabilityKeySchema.options.map(
		(capability) => ({
			capability,
			supported: Boolean(input.manifest.capabilities[capability]),
			negotiated: input.requestedCapabilities.includes(capability),
		}),
	);

	let manifest: AdapterManifest;
	try {
		manifest = adapterManifestSchema.parse(input.manifest);
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.MANIFEST_SCHEMA,
			true,
			"manifest schema valid",
		);
	} catch (error) {
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.MANIFEST_SCHEMA,
			false,
			error instanceof Error ? error.message : "manifest schema invalid",
		);
		return finalizeReport(input, checks, capabilityResults);
	}

	try {
		assertAdapterCapabilitiesExplicit(manifest);
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.CAPABILITIES_EXPLICIT,
			true,
			"all capabilities explicitly declared",
		);
	} catch (error) {
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.CAPABILITIES_EXPLICIT,
			false,
			error instanceof Error ? error.message : "capabilities not explicit",
		);
	}

	const simulatedSupported = manifest.environments.includes("SIMULATED");
	pushCheck(
		checks,
		ADAPTER_CONFORMANCE_CHECK_IDS.ENVIRONMENT_SIMULATED,
		simulatedSupported,
		simulatedSupported
			? "SIMULATED environment declared"
			: "SIMULATED environment missing",
	);

	try {
		assertAdapterPortVersionCompatible(
			input.portVersion,
			input.requiredPortVersion,
		);
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.PORT_VERSION_COMPATIBLE,
			true,
			`port version ${input.portVersion} compatible with ${input.requiredPortVersion}`,
		);
	} catch (error) {
		pushCheck(
			checks,
			ADAPTER_CONFORMANCE_CHECK_IDS.PORT_VERSION_COMPATIBLE,
			false,
			error instanceof Error ? error.message : "port version incompatible",
		);
	}

	let referenceCapabilitiesPassed = true;
	for (const capability of input.requestedCapabilities) {
		if (!manifest.capabilities[capability]) {
			referenceCapabilitiesPassed = false;
			break;
		}
	}
	pushCheck(
		checks,
		ADAPTER_CONFORMANCE_CHECK_IDS.REFERENCE_CAPABILITIES,
		referenceCapabilitiesPassed,
		referenceCapabilitiesPassed
			? "requested capabilities supported"
			: "one or more requested capabilities missing",
	);

	return finalizeReport(input, checks, capabilityResults, manifest);
}

function finalizeReport(
	input: RunAdapterConformanceSuiteInput,
	checks: AdapterConformanceCheckResult[],
	capabilityResults: RunAdapterConformanceSuiteResult["report"]["capabilityResults"],
	manifest?: AdapterManifest,
): RunAdapterConformanceSuiteResult {
	const overallOutcome = checks.every((check) => check.passed) ? "PASS" : "FAIL";
	const report = adapterConformanceReportSchema.parse({
		reportId: randomUUID(),
		suiteVersion: ADAPTER_CONFORMANCE_SUITE_VERSION,
		adapterId: manifest?.adapterId ?? input.manifest.adapterId,
		adapterVersion: manifest?.adapterVersion ?? input.manifest.adapterVersion,
		imageDigest: manifest?.imageDigest ?? input.manifest.imageDigest,
		environment: "SIMULATED",
		executedAt: input.executedAt ?? new Date().toISOString(),
		overallOutcome,
		checks,
		capabilityResults,
	});
	if (overallOutcome === "FAIL") {
		throw new AdapterGatewayError(
			"AGW_CONFORMANCE_FAILED",
			"adapter conformance suite failed",
			{ report },
		);
	}
	return { report };
}
