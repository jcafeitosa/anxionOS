import { z } from "zod";
import { assetClassSchema } from "../decisions/types";
import { AdapterGatewayError } from "./errors";
export const ADAPTER_GATEWAY_OWNER_DOMAIN = "adapter-gateway";
export const adapterDispatchIdSchema = z
	.string()
	.regex(/^agw_dsp_[0-9a-f-]{36}$/i);
/** First increment: SIMULATED only (ANX-117). */
export const adapterGatewayEnvironmentSchema = z.enum(["SIMULATED"]);
export const adapterGatewayExecutionModeSchema = z.enum([
	"SIMULATED",
	"PAPER",
	"REAL",
]);
export const adapterActorTypeSchema = z.enum(["HUMAN", "AGENT", "SYSTEM"]);
export const adapterCapabilityKeySchema = z.enum([
	"marketData",
	"simulation",
	"orderSubmit",
	"orderCancel",
	"accountRead",
	"positionRead",
	"transfer",
]);
export const adapterCapabilitiesSchema = z.object({
	marketData: z.boolean(),
	simulation: z.boolean(),
	orderSubmit: z.boolean(),
	orderCancel: z.boolean(),
	accountRead: z.boolean(),
	positionRead: z.boolean(),
	transfer: z.boolean(),
});
export const adapterLimitsSchema = z.object({
	maxConcurrentRuns: z.number().int().positive(),
	supportedOrderTypes: z.array(z.string().min(1)).default([]),
});
export const adapterManifestSchema = z.object({
	adapterId: z.string().min(1).max(64),
	adapterVersion: z.string().min(1).max(64),
	imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/i),
	environments: z.array(adapterGatewayEnvironmentSchema).min(1),
	assetClasses: z.array(assetClassSchema).default([]),
	capabilities: adapterCapabilitiesSchema,
	limits: adapterLimitsSchema,
	runtime: z.string().min(1).max(64).optional(),
	owner: z.string().min(1).max(128).optional(),
});
export class AdapterGatewayContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AdapterGatewayContractError";
	}
}
export function assertAdapterGatewayExecutionModeSupported(mode: string): void {
	if (
		mode === "REAL" ||
		mode === "REAL_EXECUTION" ||
		mode === "LIVE" ||
		mode === "PAPER"
	) {
		throw new AdapterGatewayContractError("AGW_EXECUTION_MODE_NOT_SUPPORTED");
	}
	const parsed = adapterGatewayExecutionModeSchema.safeParse(mode);
	if (!parsed.success) {
		throw new AdapterGatewayContractError("AGW_EXECUTION_MODE_NOT_SUPPORTED");
	}
}
export function assertAdapterManifestSupportsCapabilities(
	manifest: AdapterManifest,
	requested: AdapterCapabilityKey[],
): void {
	for (const capability of requested) {
		if (!manifest.capabilities[capability]) {
			throw new AdapterGatewayError(
				"AGW_CAPABILITY_MISSING",
				`adapter does not support capability ${capability}`,
				{ capability, adapterId: manifest.adapterId },
			);
		}
	}
}

export type AdapterDispatchId = z.infer<typeof adapterDispatchIdSchema>;
export type AdapterGatewayEnvironment = z.infer<
	typeof adapterGatewayEnvironmentSchema
>;
export type AdapterGatewayExecutionMode = z.infer<
	typeof adapterGatewayExecutionModeSchema
>;
export type AdapterActorType = z.infer<typeof adapterActorTypeSchema>;
export type AdapterCapabilityKey = z.infer<typeof adapterCapabilityKeySchema>;
export type AdapterCapabilities = z.infer<typeof adapterCapabilitiesSchema>;
export type AdapterLimits = z.infer<typeof adapterLimitsSchema>;
export type AdapterManifest = z.infer<typeof adapterManifestSchema>;
