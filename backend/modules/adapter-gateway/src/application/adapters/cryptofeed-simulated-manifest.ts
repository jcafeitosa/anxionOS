import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const CRYPTOFEED_ADAPTER_ID = "adapter-cryptofeed";
export const CRYPTOFEED_SIMULATED_ADAPTER_VERSION = "0.1.0-anx179-s1";
export const CRYPTOFEED_PORT_VERSION = "1.0.0";
export const CRYPTOFEED_SIMULATED_IMAGE_DIGEST =
	"sha256:8563a0419c8ebfed59523c8cc5156e23dca3982741b045f8d2c168abe867dbc1";

/**
 * Cryptofeed manifest for SIMULATED conformance (ANX-161 scaffold / ANX-179).
 * Data-only feeds — no order execution. REAL capabilities require upstream
 * Python runtime homologation — separate issue.
 */
export const cryptofeedSimulatedAdapterManifest: AdapterManifest = {
	adapterId: CRYPTOFEED_ADAPTER_ID,
	adapterVersion: CRYPTOFEED_SIMULATED_ADAPTER_VERSION,
	imageDigest: CRYPTOFEED_SIMULATED_IMAGE_DIGEST,
	environments: ["SIMULATED"],
	assetClasses: ["CRYPTO"],
	capabilities: {
		marketData: true,
		simulation: false,
		orderSubmit: false,
		orderCancel: false,
		accountRead: false,
		positionRead: false,
		transfer: false,
	},
	limits: {
		maxConcurrentRuns: 4,
		supportedOrderTypes: [],
	},
	runtime: "cryptofeed-sandbox-bun-stub",
	owner: "market-data",
};
