import type { AdapterManifest } from "@anxionos/contracts/adapter-gateway";

export const XCHANGE_ADAPTER_ID = "adapter-xchange";
export const XCHANGE_SIMULATED_ADAPTER_VERSION = "0.1.0-anx162-s5";
export const XCHANGE_PORT_VERSION = "1.0.0";
export const XCHANGE_SIMULATED_IMAGE_DIGEST =
	"sha256:" + "d".repeat(64);

/**
 * XChange manifest for SIMULATED conformance (ANX-161 scaffold / ANX-178).
 * REAL capabilities require Java bridge runtime homologation — separate issue.
 */
export const xchangeSimulatedAdapterManifest: AdapterManifest = {
	adapterId: XCHANGE_ADAPTER_ID,
	adapterVersion: XCHANGE_SIMULATED_ADAPTER_VERSION,
	imageDigest: XCHANGE_SIMULATED_IMAGE_DIGEST,
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
	runtime: "xchange-sandbox-bun-stub",
	owner: "execution",
};
