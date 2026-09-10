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
