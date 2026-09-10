import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const REFERENCE_SIMULATED_ADAPTER_ID = "anxionos-reference-simulated";
export const REFERENCE_SIMULATED_ADAPTER_VERSION = "1.0.0";
export const REFERENCE_SIMULATED_PORT_VERSION = "1.0.0";
export const REFERENCE_SIMULATED_IMAGE_DIGEST =
	"sha256:" + "0".repeat(64);

/** Reference adapter manifest for SIMULATED conformance (ANX-161). */
export const referenceSimulatedAdapterManifest: AdapterManifest = {
	adapterId: REFERENCE_SIMULATED_ADAPTER_ID,
	adapterVersion: REFERENCE_SIMULATED_ADAPTER_VERSION,
	imageDigest: REFERENCE_SIMULATED_IMAGE_DIGEST,
	environments: ["SIMULATED"],
	assetClasses: ["STOCK", "CRYPTO"],
	capabilities: {
		marketData: true,
		simulation: true,
		orderSubmit: true,
		orderCancel: true,
		accountRead: true,
		positionRead: true,
		transfer: false,
	},
	limits: {
		maxConcurrentRuns: 4,
		supportedOrderTypes: ["MARKET", "LIMIT"],
	},
	runtime: "bun-simulated",
	owner: "adapter-gateway",
};
