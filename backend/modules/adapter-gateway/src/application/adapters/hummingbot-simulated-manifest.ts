import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const HUMMINGBOT_ADAPTER_ID = "adapter-hummingbot";
export const HUMMINGBOT_SIMULATED_ADAPTER_VERSION = "0.1.0-anx162-s5";
export const HUMMINGBOT_PORT_VERSION = "1.0.0";
export const HUMMINGBOT_SIMULATED_IMAGE_DIGEST = "sha256:" + "b".repeat(64);

/**
 * Hummingbot manifest for SIMULATED conformance (ANX-161 scaffold / ANX-176).
 * REAL capabilities require upstream runtime homologation — separate issue.
 */
export const hummingbotSimulatedAdapterManifest: AdapterManifest = {
	adapterId: HUMMINGBOT_ADAPTER_ID,
	adapterVersion: HUMMINGBOT_SIMULATED_ADAPTER_VERSION,
	imageDigest: HUMMINGBOT_SIMULATED_IMAGE_DIGEST,
	environments: ["SIMULATED"],
	assetClasses: ["CRYPTO"],
	capabilities: {
		marketData: true,
		simulation: true,
		orderSubmit: false,
		orderCancel: false,
		accountRead: false,
		positionRead: false,
		transfer: false,
	},
	limits: {
		maxConcurrentRuns: 2,
		supportedOrderTypes: [],
	},
	runtime: "hummingbot-sandbox-bun-stub",
	owner: "execution",
};
