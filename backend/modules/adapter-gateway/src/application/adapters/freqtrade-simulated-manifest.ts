import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const FREQTRADE_ADAPTER_ID = "adapter-freqtrade";
export const FREQTRADE_SIMULATED_ADAPTER_VERSION = "0.1.0-anx162-s5";
export const FREQTRADE_PORT_VERSION = "1.0.0";
export const FREQTRADE_SIMULATED_IMAGE_DIGEST =
	"sha256:" + "c".repeat(64);

/**
 * Freqtrade manifest for SIMULATED conformance (ANX-161 scaffold / ANX-177).
 * REAL capabilities require upstream runtime homologation — separate issue.
 */
export const freqtradeSimulatedAdapterManifest: AdapterManifest = {
	adapterId: FREQTRADE_ADAPTER_ID,
	adapterVersion: FREQTRADE_SIMULATED_ADAPTER_VERSION,
	imageDigest: FREQTRADE_SIMULATED_IMAGE_DIGEST,
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
	runtime: "freqtrade-sandbox-bun-stub",
	owner: "execution",
};
