import { z } from "zod";
import {
	adapterCapabilityKeySchema,
	adapterGatewayEnvironmentSchema,
	adapterManifestSchema,
	type AdapterCapabilityKey,
	type AdapterManifest,
} from "./types";
import { AdapterGatewayError } from "./errors";
import { institutionalUuidSchema } from "../institutional-uuid";

export const ADAPTER_CONFORMANCE_SUITE_VERSION = 1;

export const ADAPTER_LIFECYCLE_STATUS = [
	"proposed",
	"testing",
	"approved-simulated",
	"approved-paper",
	"approved-real",
	"suspended",
	"retired",
] as const;

export const adapterLifecycleStatusSchema = z.enum(ADAPTER_LIFECYCLE_STATUS);

export const adapterRegistryEntrySchema = z.object({
	manifest: adapterManifestSchema,
	portVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
	lifecycleStatus: adapterLifecycleStatusSchema,
	registeredAt: z.string().datetime(),
	lastConformanceReportId: institutionalUuidSchema.optional(),
});

export const adapterConformanceCheckResultSchema = z.object({
	checkId: z.string().min(1),
	passed: z.boolean(),
	message: z.string().min(1),
	limitation: z.string().optional(),
});

export const adapterConformanceCapabilityResultSchema = z.object({
	capability: adapterCapabilityKeySchema,
	supported: z.boolean(),
	negotiated: z.boolean(),
});

export const adapterConformanceReportSchema = z.object({
	reportId: institutionalUuidSchema,
	suiteVersion: z.literal(ADAPTER_CONFORMANCE_SUITE_VERSION),
	adapterId: z.string().min(1).max(64),
	adapterVersion: z.string().min(1).max(64),
	imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
	environment: adapterGatewayEnvironmentSchema,
	executedAt: z.string().datetime(),
	overallOutcome: z.enum(["PASS", "FAIL"]),
	checks: z.array(adapterConformanceCheckResultSchema),
	capabilityResults: z.array(adapterConformanceCapabilityResultSchema),
});

export const ADAPTER_CONFORMANCE_CHECK_IDS = {
	MANIFEST_SCHEMA: "manifest.schema",
	CAPABILITIES_EXPLICIT: "capabilities.explicit",
	ENVIRONMENT_SIMULATED: "environment.simulated",
	PORT_VERSION_COMPATIBLE: "port.version.compatible",
	REFERENCE_CAPABILITIES: "reference.capabilities",
} as const;

export type AdapterLifecycleStatus = z.infer<typeof adapterLifecycleStatusSchema>;
export type AdapterRegistryEntry = z.infer<typeof adapterRegistryEntrySchema>;
export type AdapterConformanceCheckResult = z.infer<
	typeof adapterConformanceCheckResultSchema
>;
export type AdapterConformanceCapabilityResult = z.infer<
	typeof adapterConformanceCapabilityResultSchema
>;
export type AdapterConformanceReport = z.infer<
	typeof adapterConformanceReportSchema
>;

function parseSemverMajor(version: string): number {
	const major = Number.parseInt(version.split(".")[0] ?? "", 10);
	if (!Number.isFinite(major)) {
		throw new AdapterGatewayError(
			"AGW_MANIFEST_MISMATCH",
			`invalid port version: ${version}`,
		);
	}
	return major;
}

/** Rejects incompatible major port versions — no silent downgrade. */
export function assertAdapterPortVersionCompatible(
	manifestPortVersion: string,
	requiredPortVersion: string,
): void {
	const manifestMajor = parseSemverMajor(manifestPortVersion);
	const requiredMajor = parseSemverMajor(requiredPortVersion);
	if (manifestMajor !== requiredMajor) {
		throw new AdapterGatewayError(
			"AGW_MANIFEST_MISMATCH",
			`adapter port major ${manifestMajor} incompatible with required ${requiredMajor}`,
			{ manifestPortVersion, requiredPortVersion },
		);
	}
}

export function assertAdapterCapabilitiesExplicit(
	manifest: AdapterManifest,
): void {
	for (const capability of adapterCapabilityKeySchema.options) {
		if (typeof manifest.capabilities[capability] !== "boolean") {
			throw new AdapterGatewayError(
				"AGW_MANIFEST_MISMATCH",
				`capability ${capability} must be explicitly true or false`,
				{ capability },
			);
		}
	}
}

export function negotiateAdapterCapabilities(
	manifest: AdapterManifest,
	requested: AdapterCapabilityKey[],
): AdapterCapabilityKey[] {
	const supported: AdapterCapabilityKey[] = [];
	for (const capability of requested) {
		if (!manifest.capabilities[capability]) {
			throw new AdapterGatewayError(
				"AGW_CAPABILITY_MISSING",
				`adapter does not support capability ${capability}`,
				{ capability, adapterId: manifest.adapterId },
			);
		}
		supported.push(capability);
	}
	return supported;
}
