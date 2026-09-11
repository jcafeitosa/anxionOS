export {
	ADAPTER_GATEWAY_OWNER_DOMAIN,
	type AdapterCommandV1,
	type AdapterGatewayCommandResult,
	AdapterGatewayContractError,
	AdapterGatewayError,
	type AdapterManifest,
	adapterCommandV1Schema,
	adapterGatewayCommandResultSchema,
	assertAdapterEventOutcomeKnown,
	assertAdapterGatewayExecutionModeSupported,
	assertAdapterManifestSupportsCapabilities,
	type DispatchAdapterCommand,
	dispatchAdapterCommandSchema,
	negotiateAdapterCapabilities,
} from "@anxionos/contracts/adapter-gateway";
export {
	CRYPTOFEED_ADAPTER_ID,
	CRYPTOFEED_PORT_VERSION,
	CRYPTOFEED_SIMULATED_ADAPTER_VERSION,
	CRYPTOFEED_SIMULATED_IMAGE_DIGEST,
	cryptofeedSimulatedAdapterManifest,
} from "./application/adapters/cryptofeed-simulated-manifest";
export {
	FREQTRADE_ADAPTER_ID,
	FREQTRADE_PORT_VERSION,
	FREQTRADE_SIMULATED_ADAPTER_VERSION,
	FREQTRADE_SIMULATED_IMAGE_DIGEST,
	freqtradeSimulatedAdapterManifest,
} from "./application/adapters/freqtrade-simulated-manifest";
export {
	GOCRYPTOTRADER_ADAPTER_ID,
	GOCRYPTOTRADER_PORT_VERSION,
	GOCRYPTOTRADER_SIMULATED_ADAPTER_VERSION,
	GOCRYPTOTRADER_SIMULATED_IMAGE_DIGEST,
	gocryptotraderSimulatedAdapterManifest,
} from "./application/adapters/gocryptotrader-simulated-manifest";
export {
	HUMMINGBOT_ADAPTER_ID,
	HUMMINGBOT_PORT_VERSION,
	HUMMINGBOT_SIMULATED_ADAPTER_VERSION,
	HUMMINGBOT_SIMULATED_IMAGE_DIGEST,
	hummingbotSimulatedAdapterManifest,
} from "./application/adapters/hummingbot-simulated-manifest";
export {
	MT5_ADAPTER_ID,
	MT5_PORT_VERSION,
	MT5_SIMULATED_ADAPTER_VERSION,
	MT5_SIMULATED_IMAGE_DIGEST,
	mt5SimulatedAdapterManifest,
} from "./application/adapters/mt5-simulated-manifest";
export {
	NAUTILUS_ADAPTER_ID,
	NAUTILUS_PORT_VERSION,
	NAUTILUS_SIMULATED_ADAPTER_VERSION,
	NAUTILUS_SIMULATED_IMAGE_DIGEST,
	nautilusSimulatedAdapterManifest,
} from "./application/adapters/nautilus-simulated-manifest";
export {
	REFERENCE_SIMULATED_ADAPTER_ID,
	REFERENCE_SIMULATED_ADAPTER_VERSION,
	REFERENCE_SIMULATED_IMAGE_DIGEST,
	REFERENCE_SIMULATED_PORT_VERSION,
	referenceSimulatedAdapterManifest,
} from "./application/adapters/reference-simulated-manifest";
export {
	XCHANGE_ADAPTER_ID,
	XCHANGE_PORT_VERSION,
	XCHANGE_SIMULATED_ADAPTER_VERSION,
	XCHANGE_SIMULATED_IMAGE_DIGEST,
	xchangeSimulatedAdapterManifest,
} from "./application/adapters/xchange-simulated-manifest";
export {
	type RunAdapterConformanceSuiteInput,
	type RunAdapterConformanceSuiteResult,
	runAdapterConformanceSuite,
} from "./application/conformance/run-adapter-conformance-suite";
export { InMemoryAdapterRegistry } from "./application/registry/in-memory-adapter-registry";
export type { AdapterRegistry } from "./domain/ports/adapter-registry";
