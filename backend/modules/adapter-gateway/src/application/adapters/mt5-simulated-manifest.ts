import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const MT5_ADAPTER_ID = "adapter-mt5";
export const MT5_SIMULATED_ADAPTER_VERSION = "0.1.0-anx180-s1";
export const MT5_PORT_VERSION = "1.0.0";
/** Updated after `docker compose build mt5-sandbox` homologation oracle. */
export const MT5_SIMULATED_IMAGE_DIGEST =
	"sha256:4b8138a86c77eb18529562fb5379c07b443fe754a90645aca773f9eadab10e53";

/**
 * MetaTrader 5 manifest for SIMULATED conformance (ANX-161 scaffold / ANX-180).
 * REAL capabilities require Windows terminal + Wine/bridge homologation — separate issue.
 */
export const mt5SimulatedAdapterManifest: AdapterManifest = {
	adapterId: MT5_ADAPTER_ID,
	adapterVersion: MT5_SIMULATED_ADAPTER_VERSION,
	imageDigest: MT5_SIMULATED_IMAGE_DIGEST,
	environments: ["SIMULATED"],
	assetClasses: ["STOCK"],
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
	runtime: "mt5-sandbox-bun-stub",
	owner: "execution",
};
