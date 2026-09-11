export {
	ADAPTER_GATEWAY_OWNER_DOMAIN,
	adapterCommandV1Schema,
	adapterGatewayCommandResultSchema,
	dispatchAdapterCommandSchema,
	assertAdapterGatewayExecutionModeSupported,
	assertAdapterManifestSupportsCapabilities,
	AdapterGatewayContractError,
	AdapterGatewayError,
	assertAdapterEventOutcomeKnown,
	negotiateAdapterCapabilities,
	type AdapterCommandV1,
	type AdapterGatewayCommandResult,
	type DispatchAdapterCommand,
	type AdapterManifest,
} from "@anxionos/contracts/adapter-gateway";

export type { AdapterRegistry } from "./domain/ports/adapter-registry";
export { InMemoryAdapterRegistry } from "./application/registry/in-memory-adapter-registry";
export {
	runAdapterConformanceSuite,
	type RunAdapterConformanceSuiteInput,
	type RunAdapterConformanceSuiteResult,
} from "./application/conformance/run-adapter-conformance-suite";
export {
	referenceSimulatedAdapterManifest,
	REFERENCE_SIMULATED_ADAPTER_ID,
	REFERENCE_SIMULATED_ADAPTER_VERSION,
	REFERENCE_SIMULATED_PORT_VERSION,
	REFERENCE_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/reference-simulated-manifest";
export {
	gocryptotraderSimulatedAdapterManifest,
	GOCRYPTOTRADER_ADAPTER_ID,
	GOCRYPTOTRADER_SIMULATED_ADAPTER_VERSION,
	GOCRYPTOTRADER_PORT_VERSION,
	GOCRYPTOTRADER_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/gocryptotrader-simulated-manifest";
export {
	hummingbotSimulatedAdapterManifest,
	HUMMINGBOT_ADAPTER_ID,
	HUMMINGBOT_SIMULATED_ADAPTER_VERSION,
	HUMMINGBOT_PORT_VERSION,
	HUMMINGBOT_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/hummingbot-simulated-manifest";
export {
	freqtradeSimulatedAdapterManifest,
	FREQTRADE_ADAPTER_ID,
	FREQTRADE_SIMULATED_ADAPTER_VERSION,
	FREQTRADE_PORT_VERSION,
	FREQTRADE_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/freqtrade-simulated-manifest";
export {
	xchangeSimulatedAdapterManifest,
	XCHANGE_ADAPTER_ID,
	XCHANGE_SIMULATED_ADAPTER_VERSION,
	XCHANGE_PORT_VERSION,
	XCHANGE_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/xchange-simulated-manifest";
export {
	nautilusSimulatedAdapterManifest,
	NAUTILUS_ADAPTER_ID,
	NAUTILUS_SIMULATED_ADAPTER_VERSION,
	NAUTILUS_PORT_VERSION,
	NAUTILUS_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/nautilus-simulated-manifest";
export {
	cryptofeedSimulatedAdapterManifest,
	CRYPTOFEED_ADAPTER_ID,
	CRYPTOFEED_SIMULATED_ADAPTER_VERSION,
	CRYPTOFEED_PORT_VERSION,
	CRYPTOFEED_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/cryptofeed-simulated-manifest";
export {
	mt5SimulatedAdapterManifest,
	MT5_ADAPTER_ID,
	MT5_SIMULATED_ADAPTER_VERSION,
	MT5_PORT_VERSION,
	MT5_SIMULATED_IMAGE_DIGEST,
} from "./application/adapters/mt5-simulated-manifest";
