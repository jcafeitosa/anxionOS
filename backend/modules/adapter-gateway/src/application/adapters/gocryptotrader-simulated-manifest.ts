import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const GOCRYPTOTRADER_ADAPTER_ID = "adapter-gocryptotrader";
export const GOCRYPTOTRADER_SIMULATED_ADAPTER_VERSION = "0.1.0-anx162-s5";
export const GOCRYPTOTRADER_PORT_VERSION = "1.0.0";
export const GOCRYPTOTRADER_SIMULATED_IMAGE_DIGEST =
	"sha256:" + "a".repeat(64);

/**
 * GoCryptoTrader manifest for SIMULATED conformance (ANX-161 scaffold / ANX-175).
 * REAL capabilities require upstream binary homologation — separate issue.
 */
export const gocryptotraderSimulatedAdapterManifest: AdapterManifest = {
	adapterId: GOCRYPTOTRADER_ADAPTER_ID,
	adapterVersion: GOCRYPTOTRADER_SIMULATED_ADAPTER_VERSION,
	imageDigest: GOCRYPTOTRADER_SIMULATED_IMAGE_DIGEST,
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
	runtime: "gocryptotrader-sandbox-bun-stub",
	owner: "execution",
};
