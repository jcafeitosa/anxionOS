import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const NAUTILUS_ADAPTER_ID = "adapter-nautilus";
export const NAUTILUS_SIMULATED_ADAPTER_VERSION = "0.1.0-anx174-s1";
export const NAUTILUS_PORT_VERSION = "1.0.0";
export const NAUTILUS_SIMULATED_IMAGE_DIGEST =
	"sha256:763c3bbdca6ea36027e1bdfe1189b54e0f2640263640a667f2d4715c715ec01d";

/**
 * NautilusTrader manifest for SIMULATED conformance (ANX-161 scaffold / ANX-174).
 * REAL capabilities require upstream Python/Rust runtime homologation — separate issue.
 */
export const nautilusSimulatedAdapterManifest: AdapterManifest = {
	adapterId: NAUTILUS_ADAPTER_ID,
	adapterVersion: NAUTILUS_SIMULATED_ADAPTER_VERSION,
	imageDigest: NAUTILUS_SIMULATED_IMAGE_DIGEST,
	environments: ["SIMULATED"],
	assetClasses: ["STOCK", "CRYPTO"],
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
	runtime: "nautilus-sandbox-bun-stub",
	owner: "execution",
};
